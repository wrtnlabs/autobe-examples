import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_token_refresh_invalid(
  connection: api.IConnection,
): Promise<void> {
  const invalidToken = "invalid-refresh-token";
  // Should throw error for invalid refresh token
  await TestValidator.error(
    "invalid refresh token should throw error",
    async () => {
      await api.functional.redditClone.auth.owner.refresh(connection, {
        body: {
          refreshToken: invalidToken,
        } satisfies IRedditCloneOwner.IRefresh,
      });
    },
  );
}
