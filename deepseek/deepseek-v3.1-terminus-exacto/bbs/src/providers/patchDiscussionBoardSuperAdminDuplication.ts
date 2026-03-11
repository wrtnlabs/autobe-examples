import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminDuplication(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IDiscussionBoardArticleTag.IResponse> {
  const { search } = props.body;
  if (!search || search.trim().length === 0) {
    throw new HttpException(
      "Search term is required for duplication validation",
      400,
    );
  }
  const normalizedSearch = search.toLowerCase().trim();
  // Check for exact display name duplicates (case-insensitive exact match)
  const exactDisplayNameMatches =
    await MyGlobal.prisma.discussion_board_members.findMany({
      where: {
        deleted_at: null,
        display_name: {
          equals: normalizedSearch,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        display_name: true,
      },
      take: 1, // Just need to know if any exist
    });
  // Check for similar display names (partial match for suggestions)
  const similarDisplayNames =
    await MyGlobal.prisma.discussion_board_members.findMany({
      where: {
        deleted_at: null,
        display_name: {
          mode: "insensitive",
          contains: normalizedSearch,
        },
        NOT: {
          display_name: {
            equals: normalizedSearch,
            mode: "insensitive",
          },
        },
      },
      select: {
        id: true,
        display_name: true,
      },
      take: 5, // For suggestions
    });
  // Check for exact section name duplicates (case-insensitive exact match)
  const exactSectionNameMatches =
    await MyGlobal.prisma.discussion_board_sections.findMany({
      where: {
        deleted_at: null,
        name: {
          equals: normalizedSearch,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 1, // Just need to know if any exist
    });
  // Check for similar section topics (name or description)
  const similarSectionTopics =
    await MyGlobal.prisma.discussion_board_sections.findMany({
      where: {
        deleted_at: null,
        OR: [
          {
            name: {
              mode: "insensitive",
              contains: normalizedSearch,
            },
          },
          {
            description: {
              mode: "insensitive",
              contains: normalizedSearch,
            },
          },
        ],
        NOT: {
          name: {
            equals: normalizedSearch,
            mode: "insensitive",
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      take: 5, // For suggestions
    });
  // Determine duplicate status based on business rules
  const isDisplayNameDuplicate = exactDisplayNameMatches.length > 0;
  const isSectionTopicDuplicate = exactSectionNameMatches.length > 0;
  const isDuplicate = isDisplayNameDuplicate || isSectionTopicDuplicate;
  // Generate suggestions
  const suggestions: string[] = [];
  if (isDisplayNameDuplicate || similarDisplayNames.length > 0) {
    suggestions.push(`${search}_${Math.floor(Math.random() * 1000)}`);
    suggestions.push(`${search}${Math.floor(Math.random() * 100)}`);
    suggestions.push(`User_${search}`);
  }
  if (isSectionTopicDuplicate || similarSectionTopics.length > 0) {
    suggestions.push(`${search} Discussions`);
    suggestions.push(`Forum: ${search}`);
    suggestions.push(`${search} - Board`);
  }
  // Determine duplicate type
  let duplicateType: "display_name" | "section_topic" | undefined = undefined;
  let conflictDetails = undefined;
  if (isDisplayNameDuplicate) {
    duplicateType = "display_name";
    conflictDetails = {
      existingValue: exactDisplayNameMatches[0].display_name,
      entityType: "member",
      similarityScore: 1.0 as number & tags.Minimum<0> & tags.Maximum<1>,
    };
  } else if (isSectionTopicDuplicate) {
    duplicateType = "section_topic";
    conflictDetails = {
      existingValue: exactSectionNameMatches[0].name,
      entityType: "section",
      similarityScore: 1.0 as number & tags.Minimum<0> & tags.Maximum<1>,
    };
  } else if (similarDisplayNames.length > 0) {
    // No exact match but similar names exist - calculate similarity
    const strongestMatch = similarDisplayNames.reduce(
      (max, current) => {
        const similarity = calculateStringSimilarity(
          normalizedSearch,
          current.display_name.toLowerCase(),
        );
        return similarity > max.similarity
          ? { member: current, similarity }
          : max;
      },
      { member: similarDisplayNames[0], similarity: 0 },
    );
    if (strongestMatch.similarity > 0.7) {
      // High similarity threshold
      duplicateType = "display_name";
      conflictDetails = {
        existingValue: strongestMatch.member.display_name,
        entityType: "member",
        similarityScore: strongestMatch.similarity as number &
          tags.Minimum<0> &
          tags.Maximum<1>,
      };
    }
  } else if (similarSectionTopics.length > 0) {
    // No exact match but similar sections exist - calculate similarity
    const strongestMatch = similarSectionTopics.reduce(
      (max, current) => {
        const nameSimilarity = calculateStringSimilarity(
          normalizedSearch,
          current.name.toLowerCase(),
        );
        const descSimilarity = current.description
          ? calculateStringSimilarity(
              normalizedSearch,
              current.description.toLowerCase(),
            )
          : 0;
        const maxSimilarity = Math.max(nameSimilarity, descSimilarity);
        return maxSimilarity > max.similarity
          ? { section: current, similarity: maxSimilarity }
          : max;
      },
      { section: similarSectionTopics[0], similarity: 0 },
    );
    if (strongestMatch.similarity > 0.6) {
      // Moderate similarity threshold for topics
      duplicateType = "section_topic";
      conflictDetails = {
        existingValue: strongestMatch.section.name,
        entityType: "section",
        similarityScore: strongestMatch.similarity as number &
          tags.Minimum<0> &
          tags.Maximum<1>,
      };
    }
  }
  // If we found a duplicate through similarity, update the flag
  if (duplicateType && !isDuplicate) {
    // We found a similar duplicate (not exact)
    // The IResponse schema expects isDuplicate to be true when we have duplicateType
  }
  return {
    isDuplicate: duplicateType !== undefined, // True if any duplicate found (exact or similar)
    duplicateType,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    conflictDetails,
  };
}
// String similarity helper using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  // Fill matrix with Levenshtein distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  return maxLength === 0 ? 1.0 : 1.0 - distance / maxLength;
}
