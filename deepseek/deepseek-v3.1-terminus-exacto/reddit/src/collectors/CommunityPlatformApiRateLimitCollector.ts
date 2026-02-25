import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformApiRateLimitCollector {
  export async function collect(props: {
    body: ICommunityPlatformApiRateLimit.ICreate;
  }) {
    const id = v4();
    const window_start_time = new Date();
    const time_window_milliseconds = props.body.time_window_seconds * 1000;
    const window_end_time = new Date(
      window_start_time.getTime() + time_window_milliseconds,
    );
    const now = new Date();
    return {
      id,
      endpoint_path: props.body.endpoint_path,
      http_method: props.body.http_method,
      max_requests: props.body.max_requests,
      time_window_seconds: props.body.time_window_seconds,
      current_usage: 0,
      window_start_time,
      window_end_time,
      is_active: true,
      description: props.body.description ?? null,
      created_at: now,
      updated_at: now,
    } satisfies Prisma.community_platform_api_rate_limitsCreateInput;
  }
}
