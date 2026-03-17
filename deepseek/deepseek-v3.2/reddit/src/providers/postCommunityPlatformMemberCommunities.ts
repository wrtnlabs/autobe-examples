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
  // Validate name format: lowercase alphanumeric with hyphens only
  const nameRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!nameRegex.test(props.body.name)) {
    throw new HttpException(
      "Community name must be lowercase alphanumeric with hyphens only",
      400,
    );
  }
  // Check if community name already exists
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.body.name,
      },
    });
  if (existing) {
    throw new HttpException(
      `Community with name '${props.body.name}' already exists`,
      409,
    );
  }
  // Create community using Collector
  const data = await CommunityPlatformCommunityCollector.collect({
    body: props.body,
    ownerMember: { id: props.member.id },
  });
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data,
    ...CommunityPlatformCommunityTransformer.select(),
  });
  // Transform and return
  return await CommunityPlatformCommunityTransformer.transform(created);
}
