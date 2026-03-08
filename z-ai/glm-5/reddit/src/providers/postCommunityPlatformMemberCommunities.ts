import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityCollector } from "../collectors/CommunityPlatformCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  // Validate name format
  const name = props.body.name;
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new HttpException(
      "Community name can only contain alphanumeric characters, underscores, and hyphens",
      400,
    );
  }
  if (/^[-_]/.test(name) || /[-_]$/.test(name)) {
    throw new HttpException(
      "Community name cannot start or end with underscore or hyphen",
      400,
    );
  }
  // Validate description is not empty
  if (props.body.description.trim().length === 0) {
    throw new HttpException("Description cannot be empty", 400);
  }
  // Check name uniqueness (case-insensitive)
  const existingCommunity =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
        deleted_at: null,
      },
    });
  if (existingCommunity !== null) {
    throw new HttpException("Community name already taken", 409);
  }
  // Use collector to build CreateInput
  const createInput = await CommunityPlatformCommunityCollector.collect({
    body: props.body,
    communityPlatformMembers: { id: props.member.id },
    communityPlatformMemberSessions: { id: props.member.session_id },
  });
  // Create community with transformer select
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: createInput,
    ...CommunityPlatformCommunityTransformer.select(),
  });
  // Transform to response DTO
  return await CommunityPlatformCommunityTransformer.transform(created);
}
