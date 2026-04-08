import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_file_association } from "../prepare/prepare_random_reddit_clone_file_association";

export async function generate_random_reddit_clone_member_avatars_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneFileAssociation.ICreate>;
  }
): Promise<IRedditCloneFileAssociation.IResponse> {
  const prepared: IRedditCloneFileAssociation.ICreate =
    prepare_random_reddit_clone_file_association(props.body);
  const result: IRedditCloneFileAssociation.IResponse =
    await api.functional.redditClone.member.avatars.create(connection, {
      body: prepared,
    });
  return result;
}