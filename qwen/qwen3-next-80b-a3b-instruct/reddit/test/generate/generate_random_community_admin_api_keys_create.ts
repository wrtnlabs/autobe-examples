import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_api_key } from "../prepare/prepare_random_community_api_key";

export async function generate_random_community_admin_api_keys_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityApiKey.ICreate> | undefined;
  },
): Promise<ICommunityApiKey> {
  const prepared: ICommunityApiKey.ICreate = prepare_random_community_api_key(
    props.body,
  );
  const result: ICommunityApiKey =
    await api.functional.community.admin.api_keys.create(connection, {
      body: prepared,
    });
  return result;
}
