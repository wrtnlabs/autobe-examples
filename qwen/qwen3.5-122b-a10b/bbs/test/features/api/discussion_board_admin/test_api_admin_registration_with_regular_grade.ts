import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_with_regular_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin WITHOUT specifying grade (should default to 'regular')
  const joinConnection: api.IConnection = { host: connection.host };
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const registration = await authorize_admin_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(registration);
  // 2. Validate response grade equals 'regular'
  TestValidator.equals(
    "grade should be regular",
    registration.grade,
    "regular",
  );
  // 3. Validate all required response fields exist
  TestValidator.equals("has valid id", registration.id !== undefined, true);
  TestValidator.equals(
    "has valid email",
    registration.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "has valid display_name",
    registration.display_name,
    joinCredentials.display_name,
  );
  TestValidator.predicate(
    "has valid bio",
    registration.bio === null || typeof registration.bio === "string",
  );
  TestValidator.predicate(
    "has valid created_at",
    registration.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at",
    registration.updated_at !== undefined,
  );
  TestValidator.predicate(
    "has valid deleted_at",
    registration.deleted_at === null,
  );
  TestValidator.predicate("has valid token", registration.token !== undefined);
  // 4. Validate token structure
  TestValidator.predicate(
    "token has access",
    registration.token.access !== undefined,
  );
  TestValidator.predicate(
    "token has refresh",
    registration.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token has expired_at",
    registration.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    registration.token.refreshable_until !== undefined,
  );
}
