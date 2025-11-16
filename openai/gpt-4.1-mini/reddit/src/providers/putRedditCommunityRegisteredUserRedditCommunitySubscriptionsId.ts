import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunitySubscriptionsId(props: {
  registeredUser: RegisteredUserPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunitySubscription.IUpdate;
}): Promise<IRedditCommunitySubscription> {
  const existing =
    await MyGlobal.prisma.reddit_community_subscriptions.findUnique({
      where: { id: props.id },
    });

  if (existing === null) {
    throw new HttpException("Subscription not found", 404);
  }

  if (
    existing.reddit_community_registered_user_id !== props.registeredUser.id
  ) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_subscriptions.update({
    where: { id: props.id },
    data: {
      reddit_community_community_id:
        props.body.redditCommunity_community_id ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    registeredUser: {
      id: existing.reddit_community_registered_user_id satisfies string as string &
        tags.Format<"uuid">,
      username: "",
      profile_image_url: undefined,
    },
    community: {
      id: existing.reddit_community_community_id satisfies string as string &
        tags.Format<"uuid">,
      communityName: "",
      status: "",
      creator_id: "" as string & tags.Format<"uuid">,
    },
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
  } satisfies IRedditCommunitySubscription;
}
