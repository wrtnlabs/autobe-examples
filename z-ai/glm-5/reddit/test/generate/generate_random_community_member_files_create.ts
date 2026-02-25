import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_file } from "../prepare/prepare_random_community_file";

export async function generate_random_community_member_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityFile.ICreate>;
  },
): Promise<ICommunityFile> {
  const prepared: ICommunityFile.ICreate = prepare_random_community_file(
    props.body,
  );
  const result: ICommunityFile =
    await api.functional.community.member.files.create(connection, {
      body: prepared,
    });
  return result;
}
