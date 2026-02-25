import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardApiRateLimitCollector {
  export async function collect(props: {
    body: IDiscussionBoardApiRateLimit.ICreate;
    discussionBoardAdmins: IEntity; // from authorized actor
    discussionBoardAdminSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      endpoint_path: props.body.endpoint_path,
      http_method: props.body.http_method,
      rate_limit_type: props.body.rate_limit_type,
      requests_per_interval: props.body.requests_per_interval,
      interval_seconds: props.body.interval_seconds,
      burst_limit: props.body.burst_limit ?? null,
      enforcement_action: props.body.enforcement_action,
      enforced_at: null,
      enforcement_count: 0,
      is_active: props.body.is_active,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: undefined,
      admin: { connect: { id: props.discussionBoardAdmins.id } },
      superAdmin: { connect: { id: props.discussionBoardAdminSessions.id } },
    } satisfies Prisma.discussion_board_api_rate_limitsCreateInput;
  }
}
