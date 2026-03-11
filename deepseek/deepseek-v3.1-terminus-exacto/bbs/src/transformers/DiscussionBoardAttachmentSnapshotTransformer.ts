import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardAttachmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAttachmentTransformer } from "./DiscussionBoardAttachmentTransformer";

export namespace DiscussionBoardAttachmentSnapshotTransformer {
  export type Payload = Prisma.discussion_board_attachment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        captured_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        attachment: DiscussionBoardAttachmentTransformer.select(),
      },
    } satisfies Prisma.discussion_board_attachment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAttachmentSnapshot> {
    return {
      id: input.id,
      discussion_board_attachment_id: input.attachment.id,
      captured_at: input.captured_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      attachment: await DiscussionBoardAttachmentTransformer.transform(
        input.attachment,
      ),
    };
  }
}
