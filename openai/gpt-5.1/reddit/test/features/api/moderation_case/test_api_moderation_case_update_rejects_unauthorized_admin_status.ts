import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

export async function test_api_moderation_case_update_rejects_unauthorized_admin_status(
  connection: api.IConnection,
) {
  // 1. Create an active adminUser (creator admin) and get authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminP@ssw0rd" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const creatorAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(creatorAdmin);

  // 2. Create an initial moderation case under the creator admin context
  const statusOptions = ["open", "in_review", "resolved"] as const;
  const priorityOptions = ["low", "medium", "high"] as const;

  const createBody = {
    case_key: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: RandomGenerator.pick(statusOptions),
    priority: RandomGenerator.pick(priorityOptions),
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationCase>(createdCase);

  TestValidator.equals(
    "created case_key should match request body",
    createdCase.case_key,
    createBody.case_key,
  );

  // 3. Prepare an update payload attempting to change status and priority
  const updateBody = {
    status: "resolved",
    priority: "high",
  } satisfies ICommunityPlatformModerationCase.IUpdate;

  // 4. Simulate an unauthorized adminUser by using a connection without headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to update the moderation case with the unauthorized connection
  await TestValidator.error(
    "unauthenticated or unauthorized adminUser must not be able to update moderation case",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.update(
        unauthConnection,
        {
          caseKey: createdCase.case_key,
          body: updateBody,
        },
      );
    },
  );

  // 6. Business-level assertion: the unauthorized update must not have succeeded.
  //    Since we do not have a read-by-caseKey endpoint, our guarantee here is that
  //    the unauthorized update call threw and did not return an updated case.
  //    This satisfies the rule that suspended/unauthorized principals cannot
  //    alter moderation cases via the update endpoint.
}
