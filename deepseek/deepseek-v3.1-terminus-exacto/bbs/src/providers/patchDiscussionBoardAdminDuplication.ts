import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminDuplication(props: {
  admin: AdminPayload;
  body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IDiscussionBoardArticleTag.IResponse> {
  // Verify admin exists and is active
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Admin not found or inactive", 403);
  }
  const search = props.body.search?.trim();
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  if (!search || search.length < 2) {
    // If no search term provided, return no duplicates found
    return {
      isDuplicate: false,
      duplicateType: undefined,
      suggestions: undefined,
      conflictDetails: undefined,
    };
  }
  // Use transaction for atomic consistency across both queries
  const results = await MyGlobal.prisma.$transaction(async (tx) => {
    // Check display name duplicates in discussion_board_members
    const displayNameDuplicates = await tx.discussion_board_members.findMany({
      where: {
        display_name: {
          contains: search,
          mode: "insensitive",
          notIn: [
            "admin",
            "system",
            "administrator",
            "superuser",
            "moderator",
            "root",
          ],
        },
        deleted_at: null,
      },
      take: 10, // Limit to first 10 matches for analysis
      select: {
        display_name: true,
        created_at: true,
      },
    });
    // Check section topic duplicates in discussion_board_sections
    const sectionTopicDuplicates = await tx.discussion_board_sections.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
        deleted_at: null,
      },
      take: 10, // Limit to first 10 matches for analysis
      select: {
        name: true,
        description: true,
        created_at: true,
      },
    });
    return { displayNameDuplicates, sectionTopicDuplicates };
  });
  // Analyze results
  const hasDisplayNameDuplicates = results.displayNameDuplicates.length > 0;
  const hasSectionTopicDuplicates = results.sectionTopicDuplicates.length > 0;
  const isDuplicate = hasDisplayNameDuplicates || hasSectionTopicDuplicates;
  let duplicateType: "display_name" | "section_topic" | undefined = undefined;
  let conflictDetails = undefined;
  let suggestions = undefined;
  if (hasDisplayNameDuplicates) {
    duplicateType = "display_name";
    const existingValue = results.displayNameDuplicates[0].display_name;
    // Calculate similarity score
    const similarityScore = Math.max(
      0,
      Math.min(1, calculateStringSimilarity(search, existingValue)),
    ) as number & tags.Minimum<0> & tags.Maximum<1>;
    conflictDetails = {
      existingValue,
      entityType: "user",
      similarityScore,
    };
    suggestions = generateDisplayNameSuggestions(
      search,
      results.displayNameDuplicates.map((d) => d.display_name),
    );
  } else if (hasSectionTopicDuplicates) {
    duplicateType = "section_topic";
    const existingValue = results.sectionTopicDuplicates[0].name;
    // Calculate similarity score based on name
    const similarityScore = Math.max(
      0,
      Math.min(1, calculateStringSimilarity(search, existingValue)),
    ) as number & tags.Minimum<0> & tags.Maximum<1>;
    conflictDetails = {
      existingValue,
      entityType: "section",
      similarityScore,
    };
    suggestions = generateSectionTopicSuggestions(
      search,
      results.sectionTopicDuplicates.map((s) => s.name),
    );
  }
  return {
    isDuplicate,
    duplicateType,
    suggestions,
    conflictDetails,
  };
}
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 1.0;
  // Simple Jaccard similarity using character bigrams
  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }
  for (let i = 0; i < s2.length - 1; i++) {
    bigrams2.add(s2.substring(i, i + 2));
  }
  const intersection = new Set([...bigrams1].filter((x) => bigrams2.has(x)));
  const union = new Set([...bigrams1, ...bigrams2]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}
function generateDisplayNameSuggestions(
  proposed: string,
  existingNames: string[],
): string[] {
  const suggestions: string[] = [];
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));
  // Try adding numbers 1-9
  for (let i = 1; i <= 9; i++) {
    const suggestion = `${proposed}${i}`;
    if (!existingSet.has(suggestion.toLowerCase())) {
      suggestions.push(suggestion);
    }
  }
  // Try underscore variations
  const underscoreVariations = [
    `${proposed}_user`,
    `user_${proposed}`,
    `${proposed}_member`,
  ];
  for (const variation of underscoreVariations) {
    if (!existingSet.has(variation.toLowerCase())) {
      suggestions.push(variation);
    }
  }
  // Try with current year
  const currentYear = new Date().getFullYear();
  const yearSuggestion = `${proposed}${currentYear}`;
  if (!existingSet.has(yearSuggestion.toLowerCase())) {
    suggestions.push(yearSuggestion);
  }
  // Return only unique suggestions, limited to 5
  return [...new Set(suggestions)].slice(0, 5);
}
function generateSectionTopicSuggestions(
  proposed: string,
  existingTopics: string[],
): string[] {
  const suggestions: string[] = [];
  const existingSet = new Set(existingTopics.map((t) => t.toLowerCase()));
  const qualifiers = [
    "Advanced",
    "Contemporary",
    "Modern",
    "Classical",
    "Practical",
    "Theoretical",
    "Applied",
    "Fundamental",
  ];
  // Add qualifier prefixes
  for (const qualifier of qualifiers) {
    const suggestion = `${qualifier} ${proposed}`;
    if (!existingSet.has(suggestion.toLowerCase())) {
      suggestions.push(suggestion);
    }
  }
  // Add discussion forum variations
  const forumVariations = [
    `${proposed} Discussions`,
    `${proposed} Forum`,
    `${proposed} Exchange`,
    `${proposed} Roundtable`,
    `${proposed} Dialogue`,
  ];
  for (const variation of forumVariations) {
    if (!existingSet.has(variation.toLowerCase())) {
      suggestions.push(variation);
    }
  }
  // Return only unique suggestions, limited to 5
  return [...new Set(suggestions)].slice(0, 5);
}
