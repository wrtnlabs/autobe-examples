import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachmentAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentAccessLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_attachment_access_log } from "../prepare/prepare_random_reddit_like_attachment_access_log";

export async function generate_random_reddit_like_guest_attachments_access_create_access_log(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeAttachmentAccessLog.ICreate>;
    params: {
      attachmentId: string;
    };
  },
): Promise<IRedditLikeAttachmentAccessLog> {
  const prepared: IRedditLikeAttachmentAccessLog.ICreate =
    prepare_random_reddit_like_attachment_access_log(props.body);
  const result: IRedditLikeAttachmentAccessLog =
    await api.functional.redditLike.guest.attachments.access.createAccessLog(
      connection,
      {
        attachmentId: props.params.attachmentId,
        body: prepared,
      },
    );
  return result;
}
