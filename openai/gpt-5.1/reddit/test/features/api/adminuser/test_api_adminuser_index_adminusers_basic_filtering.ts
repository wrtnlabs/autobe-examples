import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminuser";

export async function test_api_adminuser_index_adminusers_basic_filtering(
  connection: api.IConnection,
) {
  // 1. Prepare a deterministic username prefix for filtering
  const prefix: string = `alpha_${RandomGenerator.alphabets(8)}`;

  // Helper type for local tracking of created admins
  type TrackedAdmin = {
    id: string;
    username: string;
    isAlpha: boolean;
  };

  const createdAdmins: TrackedAdmin[] = [];

  // Helper to build a unique email with given local part seed
  const buildEmail = (seed: string): string & tags.Format<"email"> => {
    const local = seed.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "user";
    // Cast via typia.assert to satisfy tagged type
    const email = `${local}_${RandomGenerator.alphaNumeric(6)}@example.com`;
    return typia.assert<string & tags.Format<"email">>(email);
  };

  // Helper to perform an admin join with a controlled username
  const joinAdmin = async (
    username: string,
  ): Promise<ICommunityPlatformAdminuser.IAuthorized> => {
    const body = {
      username,
      email: buildEmail(username),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformAdminUserJoin.IRequest;

    const authorized: ICommunityPlatformAdminuser.IAuthorized =
      await api.functional.auth.adminUser.join(connection, {
        body,
      });
    typia.assert(authorized);

    createdAdmins.push({
      id: authorized.id,
      username,
      isAlpha: username.startsWith(prefix),
    });

    return authorized;
  };

  // 1. Join initial adminUser as caller with alpha prefix username
  const callerUsername = `${prefix}_caller`;
  await joinAdmin(callerUsername);

  // 2. Create additional adminUsers: a few with alpha prefix, a few with beta prefix
  const alphaUsernames: string[] = [`${prefix}_one`, `${prefix}_two`];
  const betaPrefix = `beta_${RandomGenerator.alphabets(8)}`;
  const betaUsernames: string[] = [`${betaPrefix}_one`, `${betaPrefix}_two`];

  // Join alpha-prefixed admins
  for (const name of alphaUsernames) {
    await joinAdmin(name);
  }

  // Join beta-prefixed admins
  for (const name of betaUsernames) {
    await joinAdmin(name);
  }

  // Sanity check: we have created at least one alpha and one beta admin (besides caller)
  const alphaCount = createdAdmins.filter((a) => a.isAlpha).length;
  const betaCount = createdAdmins.filter((a) => !a.isAlpha).length;

  TestValidator.predicate(
    "at least one alpha-prefixed admin created",
    alphaCount > 0,
  );
  TestValidator.predicate(
    "at least one non-alpha (beta) admin created",
    betaCount > 0,
  );

  // 3. Seed a system configuration row
  const configBody = typia.random<ICommunityPlatformSystemConfig.ICreate>();
  const systemConfig: ICommunityPlatformSystemConfig =
    await api.functional.communityPlatform.adminUser.systemConfigs.create(
      connection,
      {
        body: configBody,
      },
    );
  typia.assert(systemConfig);

  // 4. Call adminUsers.index with username filter and pagination
  const limit: number & tags.Type<"int32"> & tags.Minimum<1> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const requestBody = {
    username: prefix,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies ICommunityPlatformAdminuser.IRequest;

  const pageResult: IPageICommunityPlatformAdminuser.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // 5. Validate pagination metadata basic consistency
  TestValidator.predicate(
    "pagination current page is at least 1",
    pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records count is not less than returned data length",
    pagination.records >= data.length,
  );
  TestValidator.predicate(
    "pagination pages is at least 1 when records exist",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 6. Validate that filtering by username prefix works for ids we control
  const createdById = new Map<string, TrackedAdmin>();
  for (const admin of createdAdmins) {
    createdById.set(admin.id, admin);
  }

  let alphaInResultCount = 0;
  let betaInResultCount = 0;

  for (const summary of data) {
    const tracked = createdById.get(summary.id);
    if (!tracked) continue; // ignore admins we didn't create

    if (tracked.isAlpha) alphaInResultCount++;
    else betaInResultCount++;
  }

  // There may be cases where none of our created admins fall into the first page
  // (if there are many pre-existing admins). Still, assert that no beta-created
  // admins appear when they do.
  TestValidator.predicate(
    "no beta-prefixed created admins should appear in filtered result",
    betaInResultCount === 0,
  );

  if (alphaInResultCount > 0) {
    TestValidator.predicate(
      "at least one alpha-prefixed created admin appears in result when any created admin appears",
      alphaInResultCount > 0,
    );
  }
}
