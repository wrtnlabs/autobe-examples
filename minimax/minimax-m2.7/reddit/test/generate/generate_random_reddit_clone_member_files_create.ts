import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_file } from "../prepare/prepare_random_reddit_clone_file";

export async function generate_random_reddit_clone_member_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneFile.ICreate>;
  },
): Promise<IRedditCloneFile> {
  const prepared: IRedditCloneFile.ICreate = prepare_random_reddit_clone_file(
    props.body,
  );
  const result: IRedditCloneFile =
    await api.functional.redditClone.member.files.create(connection, {
      body: prepared,
    });
  return result;
}
