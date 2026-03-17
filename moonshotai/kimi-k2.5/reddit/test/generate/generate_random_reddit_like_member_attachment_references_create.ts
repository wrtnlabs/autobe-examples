import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_attachment_reference } from "../prepare/prepare_random_reddit_like_attachment_reference";

export async function generate_random_reddit_like_member_attachment_references_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeAttachmentReference.ICreate>;
  },
): Promise<IRedditLikeAttachmentReference> {
  const prepared: IRedditLikeAttachmentReference.ICreate =
    prepare_random_reddit_like_attachment_reference(props.body);
  const result: IRedditLikeAttachmentReference =
    await api.functional.redditLike.member.attachment_references.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
