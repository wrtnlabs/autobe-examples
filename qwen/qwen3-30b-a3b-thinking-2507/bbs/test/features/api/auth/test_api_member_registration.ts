import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_registration(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const output = await authorize_member_join(memberConnection, {
    body: {
      href: `https://example.com/signup?utm_source=${RandomGenerator.paragraph({ sentences: 2 })}`,
      referrer: `https://example.com/login?referral_code=${RandomGenerator.alphabets(8)}`,
      ip: "192.168.0.1",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(output);
  TestValidator.equals("ID should be provided", !!output.id, true);
  TestValidator.equals("Token should be available", !!output.token, true);
}
