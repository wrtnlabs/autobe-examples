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

export async function test_api_member_join_pending_organization_attachment(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name();
  const body = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    name: displayName,
    href: "https://example.com/signup",
    referrer: "https://example.com/invite",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, { body });
  typia.assert(authorized);
  TestValidator.equals(
    "joined email should match request",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "joined display name should match request",
    authorized.displayName,
    displayName,
  );
  TestValidator.equals("member should be active", authorized.deletedAt, null);
}
