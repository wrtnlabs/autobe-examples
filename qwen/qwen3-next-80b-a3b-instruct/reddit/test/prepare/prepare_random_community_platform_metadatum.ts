import { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_metadatum(
  input?: DeepPartial<ICommunityPlatformMetadatum.ICreate>,
): ICommunityPlatformMetadatum.ICreate {
  return {
    version:
      input?.version ??
      typia.random<
        string & tags.Pattern<"^v\\d+\\.\\d+\\.\\d+$|^([a-f0-9]{40})$">
      >(),
    environment:
      input?.environment ??
      RandomGenerator.pick(["dev", "staging", "production"] as const),
    checksum:
      input?.checksum ??
      typia.random<string & tags.Pattern<"^[a-f0-9]{64}$">>(),
    changelog_url:
      input?.changelog_url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
