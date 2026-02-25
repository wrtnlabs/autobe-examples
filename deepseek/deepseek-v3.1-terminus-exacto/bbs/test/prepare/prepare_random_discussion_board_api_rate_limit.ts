import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_api_rate_limit(
  input?: DeepPartial<IDiscussionBoardApiRateLimit.ICreate>,
): IDiscussionBoardApiRateLimit.ICreate {
  return {
    endpoint_path:
      input?.endpoint_path ??
      RandomGenerator.pick([
        "/api/articles",
        "/api/comments",
        "/api/users",
        "/api/sections",
        "/api/search",
        "/api/admin/requests",
      ] as const),
    http_method:
      input?.http_method ??
      RandomGenerator.pick(["GET", "POST", "PUT", "DELETE", "PATCH"] as const),
    rate_limit_type:
      input?.rate_limit_type ??
      RandomGenerator.pick([
        "ip_based",
        "user_based",
        "global",
        "burst",
      ] as const),
    requests_per_interval:
      input?.requests_per_interval ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
      >(),
    interval_seconds:
      input?.interval_seconds ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3600>
      >(),
    burst_limit:
      input?.burst_limit ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
    enforcement_action:
      input?.enforcement_action ??
      RandomGenerator.pick(["block", "throttle", "warning"] as const),
    is_active: input?.is_active ?? typia.random<boolean>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
