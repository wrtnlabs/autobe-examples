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
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      endpoint_path: props.body.endpoint_path,
      http_method: props.body.http_method,
      rate_limit_type: props.body.rate_limit_type,
      requests_per_interval: props.body.requests_per_interval,
      interval_seconds: props.body.interval_seconds,
      burst_limit: props.body.burst_limit ?? null,
      enforcement_action: props.body.enforcement_action,
      enforced_at: null,
      enforcement_count: 0,
      is_active: true,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Optional belongsTo relations (undefined when not provided)
      user: undefined,
      admin: undefined,
      superAdmin: undefined,
    } satisfies Prisma.discussion_board_api_rate_limitsCreateInput;
  }
}
