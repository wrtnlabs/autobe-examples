import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditCommunityModeratorCommunitiesCommunityNameRules(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: IRedditCommunityCommunityRule.ICreate;
}): Promise<IRedditCommunityCommunityRule> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 404);
  }

  const moderatorAssociation =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.moderator.id,
      },
    });

  const isCreator = community.creator_member_id === props.moderator.id;

  if (!isCreator && !moderatorAssociation) {
    throw new HttpException(
      "You do not have moderator authority for this community",
      403,
    );
  }

  const now = new Date();
  const ruleId = v4() as string & tags.Format<"uuid">;

  const createdRule =
    await MyGlobal.prisma.reddit_community_community_rules.create({
      data: {
        id: ruleId,
        community_id: community.id,
        title: props.body.title,
        description: props.body.description ?? null,
        rule_number: props.body.rule_number,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: createdRule.id as string & tags.Format<"uuid">,
    community_id: createdRule.community_id as string & tags.Format<"uuid">,
    title: createdRule.title,
    description:
      createdRule.description === null ? undefined : createdRule.description,
    rule_number: createdRule.rule_number,
    created_at: toISOStringSafe(createdRule.created_at),
    updated_at: toISOStringSafe(createdRule.updated_at),
  };
}
