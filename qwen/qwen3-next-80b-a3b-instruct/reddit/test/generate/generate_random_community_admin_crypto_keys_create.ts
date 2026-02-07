import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_crypto_key } from "../prepare/prepare_random_community_crypto_key";

export async function generate_random_community_admin_crypto_keys_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityCryptoKey.ICreate> | undefined;
  },
): Promise<ICommunityCryptoKey> {
  const prepared: ICommunityCryptoKey.ICreate =
    prepare_random_community_crypto_key(props.body);
  return await api.functional.community.admin.crypto_keys.create(connection, {
    body: prepared,
  });
}
