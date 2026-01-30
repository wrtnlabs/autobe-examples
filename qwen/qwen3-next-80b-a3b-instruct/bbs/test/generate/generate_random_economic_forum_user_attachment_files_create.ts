import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAttachmentFile";
import { prepare_random_economic_forum_attachment_file } from "../prepare/prepare_random_economic_forum_attachment_file";
export async function generate_random_economic_forum_user_attachment_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumAttachmentFile.ICreate>;
  },
): Promise<IEconomicForumAttachmentFile> {
  const prepared: IEconomicForumAttachmentFile.ICreate =
    prepare_random_economic_forum_attachment_file(props.body);
  const result: IEconomicForumAttachmentFile =
    await api.functional.economicForum.user.attachmentFiles.create(connection, {
      body: prepared,
    });
  return result;
}
