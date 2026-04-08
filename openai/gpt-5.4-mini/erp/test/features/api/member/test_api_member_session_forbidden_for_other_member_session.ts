import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_forbidden_for_other_member_session(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_member_join(firstConnection, {
    body: {
      email: `member1_${RandomGenerator.alphabets(10)}@example.com`,
      password: "Password123!" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(firstAuthorized);
  const secondConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_join(secondConnection, {
    body: {
      email: `member2_${RandomGenerator.alphabets(10)}@example.com`,
      password: "Password123!" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(secondAuthorized);
  await TestValidator.httpError(
    "other member's session should be forbidden",
    403,
    async () => {
      await api.functional.erpHrmTime.member.sessions.at(firstConnection, {
        sessionId: secondAuthorized.id,
      });
    },
  );
}
