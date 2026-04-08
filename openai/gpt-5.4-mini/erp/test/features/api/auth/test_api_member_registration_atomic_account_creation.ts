import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_atomic_account_creation(
  connection: api.IConnection,
): Promise<void> {
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstPassword = "P@ssw0rd1234";
  const displayName = RandomGenerator.name();
  const avatarImageUrl = typia.random<string & tags.Format<"uri">>();
  const phoneNumber = RandomGenerator.mobile();
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: firstEmail,
      password: firstPassword,
      displayName,
      avatarImageUrl,
      phoneNumber,
      href: connection.host,
      referrer: connection.host,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined email should match request",
    authorized.email,
    firstEmail,
  );
  TestValidator.equals(
    "joined display name should match request",
    authorized.displayName,
    displayName,
  );
  TestValidator.equals(
    "joined avatar should match request",
    authorized.avatarImageUrl,
    avatarImageUrl,
  );
  TestValidator.equals(
    "joined phone number should match request",
    authorized.phoneNumber,
    phoneNumber,
  );
  TestValidator.predicate("member id should exist", authorized.id.length > 0);
  TestValidator.predicate(
    "token access should exist",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh should exist",
    authorized.token.refresh.length > 0,
  );
  const retryConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate member join should be rejected",
    [400, 409],
    async () => {
      await authorize_member_join(retryConnection, {
        body: {
          email: firstEmail,
          password: firstPassword,
          displayName: RandomGenerator.name(),
          avatarImageUrl: null,
          phoneNumber: null,
          href: connection.host,
          referrer: connection.host,
          ip: null,
        } satisfies IErpHrmTimeMember.IJoin,
      });
    },
  );
}
