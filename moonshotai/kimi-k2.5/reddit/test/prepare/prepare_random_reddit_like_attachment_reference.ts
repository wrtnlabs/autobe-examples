import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_attachment_reference(
  input?: DeepPartial<IRedditLikeAttachmentReference.ICreate>,
): IRedditLikeAttachmentReference.ICreate {
  return {
    attachmentId:
      input?.attachmentId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
