import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_api_keys_create } from "../../../generate/generate_random_community_admin_api_keys_create";
import { prepare_random_community_api_key } from "../../../prepare/prepare_random_community_api_key";

export async function test_api_admin_api_key_creation_with_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput: ICommunityAdmin.IJoin =
    typia.random<ICommunityAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: joinInput });
  // 2. Create API key with description
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const apiKey = await generate_random_community_admin_api_keys_create(
    adminConnection,
    {
      body: {
        description,
      },
    },
  );
  typia.assert(apiKey);
  // 3. Validate API key properties
  TestValidator.equals("status is active", apiKey.status, "active");
  TestValidator.equals("description matches", apiKey.description, description);
}
