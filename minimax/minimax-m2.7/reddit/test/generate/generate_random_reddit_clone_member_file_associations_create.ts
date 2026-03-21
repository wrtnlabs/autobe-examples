import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_file_association } from "../prepare/prepare_random_reddit_clone_file_association";

export async function generate_random_reddit_clone_member_file_associations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneFileAssociation.ICreate>;
  },
): Promise<IRedditCloneFileAssociation> {
  const prepared: IRedditCloneFileAssociation.ICreate =
    prepare_random_reddit_clone_file_association(props.body);
  const result: IRedditCloneFileAssociation =
    await api.functional.redditClone.member.file_associations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
