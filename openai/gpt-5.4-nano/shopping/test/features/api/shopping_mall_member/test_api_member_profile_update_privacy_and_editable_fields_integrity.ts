import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_privacy_and_editable_fields_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a member account using the provided authorization utility
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Establish baseline profile state
  const baseline: IShoppingMallMember =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(baseline);
  // 2) Update editable field(s) allowed by IShoppingMallMember.IUpdate (only email)
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const updated1: IShoppingMallMember =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberConnection,
      {
        body: {
          email: firstEmail,
        },
      },
    );
  typia.assert(updated1);
  // 3) Privacy/integrity: response must match the member projection DTO shape
  TestValidator.equals("member id stable", updated1.id, baseline.id);
  TestValidator.equals("email updated", updated1.email, firstEmail);
  TestValidator.equals(
    "created_at stable",
    updated1.created_at,
    baseline.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updated1.deleted_at,
    baseline.deleted_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated1.updated_at,
    baseline.updated_at,
  );
  // 4) Second update changes only email again; other fields should remain stable except updated_at
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const updated2: IShoppingMallMember =
    await api.functional.shoppingMall.member.profile.updateProfile(
      memberConnection,
      {
        body: {
          email: secondEmail,
        },
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "member id stable after 2nd update",
    updated2.id,
    baseline.id,
  );
  TestValidator.equals("email updated again", updated2.email, secondEmail);
  TestValidator.equals(
    "created_at stable after 2nd update",
    updated2.created_at,
    baseline.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged after 2nd update",
    updated2.deleted_at,
    baseline.deleted_at,
  );
  TestValidator.notEquals(
    "updated_at changed again",
    updated2.updated_at,
    updated1.updated_at,
  );
}
