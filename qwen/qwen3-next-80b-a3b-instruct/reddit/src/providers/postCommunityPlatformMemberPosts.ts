import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Validate exactly one content type is provided
  const hasText = props.body.text !== undefined;
  const hasUrl = props.body.url !== undefined;
  const hasImage = props.body.image !== undefined;
  const contentTypesCount = [hasText, hasUrl, hasImage].filter(Boolean).length;
  if (contentTypesCount !== 1) {
    throw new HttpException(
      "Exactly one content type (text, url, or image) must be provided",
      400,
    );
  }
  // The endpoint POST /communityPlatform/member/posts must include community context
  // According to the collector definition, CommunityPlatformPostCollector expects communityPlatformCommunities as context
  // But MemberPayload has no community_id property
  // And the endpoint URL has no community parameter
  // This suggests the operation design is flawed
  // For now, the system does not provide community context
  // We must throw a meaningful error indicating the missing context
  throw new HttpException(
    "Cannot create post: community context is required but not provided in the request. The endpoint must include community information to associate the post with a community.",
    400,
  );
}
