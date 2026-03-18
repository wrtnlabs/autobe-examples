import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const joined: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password: originalPassword,
      } satisfies IHrmTimeTrackingMember.IJoin,
    });
  typia.assert(joined);
  const resetResponse: IHrmTimeTrackingMember =
    await api.functional.hrmTimeTracking.member.password_resets.update(
      memberConnection,
      {
        body: {
          token: typia.random<string & tags.Format<"uuid">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IHrmTimeTrackingMember.IResetPassword,
      },
    );
  typia.assert(resetResponse);
  TestValidator.equals(
    "member id should remain the same",
    resetResponse.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should remain the same",
    resetResponse.email,
    joined.email,
  );
  TestValidator.equals(
    "member active state should remain the same",
    resetResponse.isActive,
    joined.isActive,
  );
  TestValidator.equals(
    "member created timestamp should remain the same",
    resetResponse.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "member updated timestamp should remain the same",
    resetResponse.updatedAt,
    joined.updatedAt,
  );
  TestValidator.equals(
    "member deleted timestamp should remain the same",
    resetResponse.deletedAt,
    joined.deletedAt,
  );
}
