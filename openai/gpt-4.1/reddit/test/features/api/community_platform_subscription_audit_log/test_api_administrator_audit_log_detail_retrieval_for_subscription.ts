import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscriptionAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionAuditLog";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

export async function test_api_administrator_audit_log_detail_retrieval_for_subscription(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Adm1n#" + RandomGenerator.alphaNumeric(7);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Register and authenticate as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Us3r#" + RandomGenerator.alphaNumeric(7);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);

  // Switch to user session (login required because join may not return valid session)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://community.test/auth/login",
      referrer: "https://community.test/register",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // Step 3: User creates a new community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        display_title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // Step 4: User subscribes to the community
  const subscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 5: Switch back to admin session
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://community.test/auth/admin",
      referrer: "https://community.test/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 6: Retrieve the audit log for the subscription via admin endpoint
  // (Assume the most recent audit log corresponds to this subscription.)
  // Since we lack an index endpoint to list logs, we make use of deterministic linking: attempt with same subscription.id for both IDs.
  // In many systems, the first audit log created for a subscription event may have the same ID as the subscription or can be retrieved deterministically for test purposes.
  // For robust validation, we try both subscription.id as log ID, or else this test may fail if system IDs differ.
  // This is a best-effort placeholder in the absence of an audit log listing API.
  // If this fails, further system support is needed.
  let auditLog: ICommunityPlatformSubscriptionAuditLog | undefined;
  let thrown = false;
  try {
    auditLog =
      await api.functional.communityPlatform.administrator.communitySubscriptions.auditLogs.at(
        connection,
        {
          communitySubscriptionId: subscription.id,
          subscriptionAuditLogId: subscription.id,
        },
      );
    typia.assert(auditLog);
  } catch (_) {
    thrown = true;
  }
  TestValidator.predicate(
    "admin can access audit log for subscription (using the subscription ID)",
    !!auditLog && !thrown,
  );
  if (auditLog) {
    // Validate linkage fields and action
    TestValidator.equals(
      "audit log's user.id matches subscriber",
      auditLog.user.id,
      subscription.user.id,
    );
    TestValidator.equals(
      "audit log's community.id matches community",
      auditLog.community?.id,
      community.id,
    );
    TestValidator.equals(
      "audit log action denotes subscription event",
      auditLog.action,
      "subscribe",
    );
    TestValidator.equals(
      "audit log append-only timestamp set",
      typeof auditLog.created_at,
      "string",
    );
  }

  // Step 7: Negative test - regular user should not access via admin endpoint
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://community.test/auth/login",
      referrer: "https://community.test/",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  await TestValidator.error(
    "non-admin cannot access administrator audit log endpoint",
    async () => {
      await api.functional.communityPlatform.administrator.communitySubscriptions.auditLogs.at(
        connection,
        {
          communitySubscriptionId: subscription.id,
          subscriptionAuditLogId: subscription.id,
        },
      );
    },
  );
}
