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

export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd1234!";
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email registration should be rejected",
    [400, 409],
    async () => {
      await authorize_member_join(duplicateConnection, {
        body: {
          email,
          password: "P@ssw0rd5678!",
          displayName: RandomGenerator.name(),
          avatarImageUrl: null,
          phoneNumber: RandomGenerator.mobile(),
          href: "https://example.com/onboarding/duplicate",
          referrer: "https://example.com",
          ip: "127.0.0.1",
        } satisfies IErpHrmTimeMember.IJoin,
      });
    },
  );
}
