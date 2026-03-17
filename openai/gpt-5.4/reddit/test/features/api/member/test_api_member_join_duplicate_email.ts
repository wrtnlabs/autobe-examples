import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const first: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(firstConnection, {
      body: firstBody,
    });
  typia.assert(first);
  TestValidator.equals("first join email matches input", first.email, email);
  TestValidator.predicate("first join returns member id", first.id.length > 0);
  TestValidator.predicate(
    "first join returns member code",
    first.code.length > 0,
  );
  TestValidator.predicate(
    "first join returns access token",
    first.token.access.length > 0,
  );
  TestValidator.predicate(
    "first join returns refresh token",
    first.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "member connection headers created",
    firstConnection.headers !== undefined,
  );
  TestValidator.equals(
    "member connection authorization header updated",
    firstConnection.headers!.Authorization,
    first.token.access,
  );
  const secondConnection: api.IConnection = { host: connection.host };
  const secondBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  await TestValidator.error("duplicate email join is rejected", async () => {
    await authorize_member_join(secondConnection, {
      body: secondBody,
    });
  });
}
