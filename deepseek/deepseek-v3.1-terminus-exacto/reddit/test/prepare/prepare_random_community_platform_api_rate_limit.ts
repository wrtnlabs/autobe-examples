import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_api_rate_limit(
  input?: DeepPartial<ICommunityPlatformApiRateLimit.ICreate>,
): ICommunityPlatformApiRateLimit.ICreate {
  return {
    endpoint_path:
      input?.endpoint_path ??
      RandomGenerator.pick([
        "/api/posts",
        "/api/comments",
        "/api/users",
        "/api/votes",
        "/api/communities",
        "/api/reports",
      ]) +
        RandomGenerator.pick(["", "/*", "/:id"]) +
        RandomGenerator.pick(["", "?query=true"]),
    http_method:
      input?.http_method ??
      RandomGenerator.pick(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]),
    max_requests:
      input?.max_requests ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    time_window_seconds:
      input?.time_window_seconds ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
