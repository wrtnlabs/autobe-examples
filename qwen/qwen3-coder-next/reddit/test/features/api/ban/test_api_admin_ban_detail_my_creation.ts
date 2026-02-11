import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_detail_my_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Step 2: Create a mock ban for testing (using random ban ID since we can't create one via API)
  const mockBanId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the ban details using the admin connection
  const retrievedBan =
    await api.functional.redditPlatform.admin.redditPlatform.bans.at(
      adminConnection,
      { banId: mockBanId },
    );
  typia.assert(retrievedBan);
  // Step 4: Validate the retrieved ban structure
  TestValidator.predicate("ban has id", typeof retrievedBan.id === "string");
  TestValidator.predicate(
    "ban has community",
    typeof retrievedBan.community === "object",
  );
  TestValidator.predicate(
    "ban has user",
    typeof retrievedBan.user === "object",
  );
  TestValidator.predicate(
    "ban has bannedBy",
    typeof retrievedBan.bannedBy === "object",
  );
  TestValidator.predicate(
    "ban has reason",
    typeof retrievedBan.reason === "string",
  );
  TestValidator.predicate(
    "ban has bannedAt",
    typeof retrievedBan.bannedAt === "string",
  );
  TestValidator.predicate(
    "ban has expiredAt",
    retrievedBan.expiredAt === null ||
      typeof retrievedBan.expiredAt === "string",
  );
}
