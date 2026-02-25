import { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentModerationCollector {
  export async function collect(props: {
    body: ICommunityPlatformCommentModeration.ICreate;
    communityPlatformModerators: IEntity;
    communityPlatformComments: IEntity;
  }) {
    const id: string = v4();
    // Calculate expired_at based on duration_hours
    const expired_at = props.body.duration_hours
      ? new Date(Date.now() + props.body.duration_hours * 60 * 60 * 1000)
      : null;
    return {
      id,
      action_type: props.body.action_type,
      reason: props.body.reason,
      status: props.body.status,
      duration_hours: props.body.duration_hours ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      expired_at,
      moderator: { connect: { id: props.communityPlatformModerators.id } },
      comment: { connect: { id: props.communityPlatformComments.id } },
    } satisfies Prisma.community_platform_comment_moderationsCreateInput;
  }
}
