import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_attachment } from "../prepare/prepare_random_reddit_like_attachment";

export async function generate_random_reddit_like_member_attachments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeAttachment.ICreate>;
  },
): Promise<IRedditLikeAttachment> {
  const prepared: IRedditLikeAttachment.ICreate =
    prepare_random_reddit_like_attachment(props.body);
  const result: IRedditLikeAttachment =
    await api.functional.redditLike.member.attachments.create(connection, {
      body: prepared,
    });
  return result;
}
