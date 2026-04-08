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

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    email:
      `member_${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
        tags.Format<"email">,
    password: "StrongP@ssw0rd123!" satisfies string & tags.Format<"password">,
    displayName: RandomGenerator.name(),
    avatarImageUrl: `https://example.com/avatars/${RandomGenerator.alphaNumeric(8)}.png`,
    phoneNumber: RandomGenerator.mobile(),
    href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/referrer/${RandomGenerator.alphaNumeric(8)}`,
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, { body });
  typia.assert(authorized);
  TestValidator.equals(
    "registered email should match request",
    authorized.email,
    body.email,
  );
  TestValidator.equals(
    "registered display name should match request",
    authorized.displayName,
    body.displayName,
  );
  TestValidator.equals(
    "avatar url should match request",
    authorized.avatarImageUrl,
    body.avatarImageUrl ?? null,
  );
  TestValidator.equals(
    "phone number should match request",
    authorized.phoneNumber,
    body.phoneNumber ?? null,
  );
  TestValidator.predicate(
    "access token should be present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be after creation",
    new Date(authorized.token.expired_at).getTime() >
      new Date(authorized.createdAt).getTime(),
  );
  TestValidator.predicate(
    "refresh token expiration should be after access expiration",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}
