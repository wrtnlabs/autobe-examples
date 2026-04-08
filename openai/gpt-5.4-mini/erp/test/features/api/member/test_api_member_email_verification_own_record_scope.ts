import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_own_record_scope(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/first",
      referrer: "https://example.com/referrer/first",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const secondConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/second",
      referrer: "https://example.com/referrer/second",
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  await TestValidator.httpError(
    "other member cannot access verification record",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.emailVerifications.at(
        secondConnection,
        {
          verificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
