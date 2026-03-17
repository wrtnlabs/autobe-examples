import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_attachment_access_log(
  input?: DeepPartial<IRedditLikeAttachmentAccessLog.ICreate>,
): IRedditLikeAttachmentAccessLog.ICreate {
  return {
    access_type:
      input?.access_type ??
      RandomGenerator.pick([
        "view",
        "download",
        "thumbnail_view",
        "metadata_read",
      ] as const),
    ip_address:
      input?.ip_address ?? typia.random<string & tags.Format<"ipv4">>(),
    user_agent:
      input?.user_agent ?? RandomGenerator.paragraph({ sentences: 1 }),
    referer: input?.referer ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
