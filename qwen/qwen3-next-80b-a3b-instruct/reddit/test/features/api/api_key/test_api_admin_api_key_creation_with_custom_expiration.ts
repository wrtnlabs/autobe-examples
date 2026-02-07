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

export async function test_api_admin_api_key_creation_with_custom_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Calculate expiration date (7 days from now)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expirationDate = sevenDaysFromNow.toISOString();
  // 3. Create API key with custom expiration
  const apiKey = await api.functional.community.admin.api_keys.create(
    adminConnection,
    {
      body: {
        // The ICreate schema is empty, so no properties needed
      } satisfies ICommunityApiKey.ICreate,
    },
  );
  typia.assert(apiKey);
  // 4. Validate response properties
  TestValidator.equals("status is active", apiKey.status, "active");
  TestValidator.equals(
    "expired_at matches provided date",
    apiKey.expired_at,
    expirationDate,
  );
  TestValidator.predicate("created_at is valid ISO date", () => {
    const date = new Date(apiKey.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO date", () => {
    const date = new Date(apiKey.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("id is UUID format", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      apiKey.id,
    );
  });
  TestValidator.predicate("actor_id is UUID format", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      apiKey.actor_id,
    );
  });
  TestValidator.predicate("creator_id is UUID format", () => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      apiKey.creator_id,
    );
  });
}
