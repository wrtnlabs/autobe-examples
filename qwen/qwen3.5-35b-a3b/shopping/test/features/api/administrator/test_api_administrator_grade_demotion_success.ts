import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Super Administrator A (will perform demotion)
  const superAConnection: api.IConnection = { host: connection.host };
  const superAAuth = await authorize_super_administrator_join(
    superAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAAuth);
  // 2. Create Super Administrator B (will be demoted)
  const superBConnection: api.IConnection = { host: connection.host };
  const superBAuth = await authorize_super_administrator_join(
    superBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superBAuth);
  // 3. Demote Super Administrator B using Super Administrator A's connection
  const demotionResult =
    await api.functional.ecommerceMall.superAdministrator.administrators.grades.action(
      superAConnection,
      {
        administratorId: superBAuth.id,
        body: {
          grade: "regular",
        } satisfies IEcommerceMallAdministrator.IUpdate,
      },
    );
  typia.assert(demotionResult);
  // 4. Validate grade changed to regular
  TestValidator.equals(
    "grade changed to regular",
    demotionResult.grade,
    "regular",
  );
  // 5. Validate other properties preserved
  TestValidator.equals(
    "display name preserved",
    demotionResult.display_name,
    superBAuth.superAdministrator.display_name,
  );
  TestValidator.equals(
    "email preserved",
    demotionResult.email,
    superBAuth.superAdministrator.email,
  );
  // 6. Validate timestamp updated
  TestValidator.predicate("timestamp is recent", () => {
    const now = new Date();
    const demotedAt = new Date(demotionResult.updated_at);
    const diff = Math.abs(now.getTime() - demotedAt.getTime());
    return diff < 5000; // Within 5 seconds
  });
  // 7. Validate other immutable fields unchanged
  TestValidator.equals("account still exists", demotionResult.deleted_at, null);
  TestValidator.equals("not banned", demotionResult.is_banned, false);
}
