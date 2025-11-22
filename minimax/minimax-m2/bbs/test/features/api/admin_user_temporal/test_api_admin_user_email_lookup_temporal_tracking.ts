import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_admin_user_email_lookup_temporal_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for temporal tracking validation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminDisplayName = RandomGenerator.name();
  const systemAdmin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: adminDisplayName,
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(systemAdmin);

  // Step 2: Create first registered member account (recently created user)
  const user1Email: string = typia.random<string & tags.Format<"email">>();
  const user1DisplayName = RandomGenerator.name();
  const user1Bio = RandomGenerator.paragraph({ sentences: 2 });

  const user1: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: user1DisplayName,
        email: user1Email,
        bio: user1Bio,
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user1);

  // Record timestamps for validation
  const user1CreationTime = new Date();
  const user1CreationISO = user1CreationTime.toISOString();

  // Step 3: Create second registered member account with delay (different creation time)
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

  const user2Email: string = typia.random<string & tags.Format<"email">>();
  const user2DisplayName = RandomGenerator.name();
  const user2Bio = RandomGenerator.paragraph({ sentences: 3 });

  const user2: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: user2DisplayName,
        email: user2Email,
        bio: user2Bio,
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user2);

  const user2CreationTime = new Date();
  const user2CreationISO = user2CreationTime.toISOString();

  // Step 4: Create third registered member account with another delay
  await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second delay

  const user3Email: string = typia.random<string & tags.Format<"email">>();
  const user3DisplayName = RandomGenerator.name();

  const user3: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: user3DisplayName,
        email: user3Email,
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(user3);

  const user3CreationTime = new Date();
  const user3CreationISO = user3CreationTime.toISOString();

  // Step 5: Authenticate as system administrator for email lookup testing
  await api.functional.auth.systemAdministrator.login.signIn(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      href: "https://admin.example.com/dashboard",
      referrer: "https://admin.example.com",
    } satisfies IEconPoliticalDiscussionUser.ILogin,
  });

  // Step 6: Test email lookup for user1 and validate temporal fields
  const user1Lookup: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
      connection,
      {
        email: user1Email,
      },
    );
  typia.assert(user1Lookup);

  TestValidator.equals("user1 email matches", user1Lookup.email, user1Email);
  TestValidator.equals(
    "user1 display name matches",
    user1Lookup.display_name,
    user1DisplayName,
  );
  TestValidator.equals("user1 bio matches", user1Lookup.bio, user1Bio);
  TestValidator.equals("user1 status is active", user1Lookup.status, "active");
  TestValidator.predicate(
    "user1 created_at is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      user1Lookup.created_at,
    ),
  );
  TestValidator.predicate(
    "user1 updated_at matches created_at initially",
    user1Lookup.updated_at === user1Lookup.created_at,
  );
  TestValidator.equals(
    "user1 deleted_at is undefined initially",
    user1Lookup.deleted_at,
    undefined,
  );

  // Step 7: Test email lookup for user2 and validate temporal fields
  const user2Lookup: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
      connection,
      {
        email: user2Email,
      },
    );
  typia.assert(user2Lookup);

  TestValidator.equals("user2 email matches", user2Lookup.email, user2Email);
  TestValidator.equals(
    "user2 display name matches",
    user2Lookup.display_name,
    user2DisplayName,
  );
  TestValidator.equals("user2 bio matches", user2Lookup.bio, user2Bio);
  TestValidator.equals("user2 status is active", user2Lookup.status, "active");
  TestValidator.predicate(
    "user2 created_at is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      user2Lookup.created_at,
    ),
  );
  TestValidator.predicate(
    "user2 updated_at matches created_at initially",
    user2Lookup.updated_at === user2Lookup.created_at,
  );
  TestValidator.equals(
    "user2 deleted_at is undefined initially",
    user2Lookup.deleted_at,
    undefined,
  );

  // Step 8: Test email lookup for user3 and validate temporal fields
  const user3Lookup: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
      connection,
      {
        email: user3Email,
      },
    );
  typia.assert(user3Lookup);

  TestValidator.equals("user3 email matches", user3Lookup.email, user3Email);
  TestValidator.equals(
    "user3 display name matches",
    user3Lookup.display_name,
    user3DisplayName,
  );
  TestValidator.equals("user3 bio is null", user3Lookup.bio, null);
  TestValidator.equals("user3 status is active", user3Lookup.status, "active");
  TestValidator.predicate(
    "user3 created_at is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      user3Lookup.created_at,
    ),
  );
  TestValidator.predicate(
    "user3 updated_at matches created_at initially",
    user3Lookup.updated_at === user3Lookup.created_at,
  );
  TestValidator.equals(
    "user3 deleted_at is undefined initially",
    user3Lookup.deleted_at,
    undefined,
  );

  // Step 9: Test updated_at timestamp tracking by updating user1 profile
  await api.functional.auth.registeredMember.login(connection, {
    body: {
      email: user1Email,
      password: "1234",
      href: "https://example.com/profile",
      referrer: "https://example.com",
    } satisfies IEconPoliticalDiscussionRegisteredMember.ILogin,
  });

  // Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  const updatedUser1Profile: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.update(connection, {
      userId: user1.id,
      body: {
        bio: "Updated biography for temporal testing",
        display_name: `${user1DisplayName} (Updated)`,
      } satisfies IEconPoliticalDiscussionUser.IUpdate,
    });
  typia.assert(updatedUser1Profile);

  // Step 10: Switch back to admin and validate updated_at timestamp changes
  await api.functional.auth.systemAdministrator.login.signIn(connection, {
    body: {
      email: adminEmail,
      password: "1234",
      href: "https://admin.example.com/dashboard",
      referrer: "https://admin.example.com",
    } satisfies IEconPoliticalDiscussionUser.ILogin,
  });

  const user1UpdatedLookup: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
      connection,
      {
        email: user1Email,
      },
    );
  typia.assert(user1UpdatedLookup);

  TestValidator.equals(
    "user1 updated bio reflects changes",
    user1UpdatedLookup.bio,
    "Updated biography for temporal testing",
  );
  TestValidator.equals(
    "user1 updated display name reflects changes",
    user1UpdatedLookup.display_name,
    `${user1DisplayName} (Updated)`,
  );
  TestValidator.predicate(
    "user1 updated_at is later than created_at",
    new Date(user1UpdatedLookup.updated_at) >
      new Date(user1UpdatedLookup.created_at),
  );
  TestValidator.predicate(
    "user1 created_at remains unchanged",
    user1UpdatedLookup.created_at === user1Lookup.created_at,
  );

  // Step 11: Test multiple updates to verify updated_at tracking
  await api.functional.auth.registeredMember.login(connection, {
    body: {
      email: user1Email,
      password: "1234",
      href: "https://example.com/profile",
      referrer: "https://example.com",
    } satisfies IEconPoliticalDiscussionRegisteredMember.ILogin,
  });

  await new Promise((resolve) => setTimeout(resolve, 100));

  const secondUpdate: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.update(connection, {
      userId: user1.id,
      body: {
        display_name: `${user1DisplayName} (Twice Updated)`,
      } satisfies IEconPoliticalDiscussionUser.IUpdate,
    });
  typia.assert(secondUpdate);

  const user1SecondUpdateLookup: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
      connection,
      {
        email: user1Email,
      },
    );
  typia.assert(user1SecondUpdateLookup);

  TestValidator.equals(
    "user1 second update display name reflects changes",
    user1SecondUpdateLookup.display_name,
    `${user1DisplayName} (Twice Updated)`,
  );
  TestValidator.predicate(
    "user1 updated_at advances with each update",
    new Date(user1SecondUpdateLookup.updated_at) >
      new Date(user1UpdatedLookup.updated_at),
  );

  // Step 12: Validate temporal field consistency across all users
  const allUsers = [user1Lookup, user2Lookup, user3Lookup];
  for (const user of allUsers) {
    TestValidator.predicate(
      `${user.display_name} has valid created_at format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(user.created_at),
    );
    TestValidator.predicate(
      `${user.display_name} has valid updated_at format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(user.updated_at),
    );
    TestValidator.predicate(
      `${user.display_name} created_at is not future date`,
      new Date(user.created_at) <= new Date(),
    );
    TestValidator.predicate(
      `${user.display_name} updated_at is not future date`,
      new Date(user.updated_at) <= new Date(),
    );
    TestValidator.predicate(
      `${user.display_name} temporal fields are chronologically consistent`,
      new Date(user.created_at) <= new Date(user.updated_at),
    );
  }

  // Step 13: Test temporal field accuracy with creation time validation
  const user1CreationTimeFromDB = new Date(user1Lookup.created_at);
  const user2CreationTimeFromDB = new Date(user2Lookup.created_at);
  const user3CreationTimeFromDB = new Date(user3Lookup.created_at);

  TestValidator.predicate(
    "user1 creation time is within expected range",
    Math.abs(user1CreationTimeFromDB.getTime() - user1CreationTime.getTime()) <
      5000,
  );
  TestValidator.predicate(
    "user2 creation time is within expected range",
    Math.abs(user2CreationTimeFromDB.getTime() - user2CreationTime.getTime()) <
      5000,
  );
  TestValidator.predicate(
    "user3 creation time is within expected range",
    Math.abs(user3CreationTimeFromDB.getTime() - user3CreationTime.getTime()) <
      5000,
  );

  // Step 14: Validate that users created later have later timestamps
  TestValidator.predicate(
    "user2 created after user1",
    user2CreationTimeFromDB > user1CreationTimeFromDB,
  );
  TestValidator.predicate(
    "user3 created after user2",
    user3CreationTimeFromDB > user2CreationTimeFromDB,
  );

  // Step 15: Test temporal tracking for different user states (active vs potentially deactivated)
  // Create a user that might be deactivated (for future testing scenarios)
  const potentialDeactivatedEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const potentialDeactivated: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: "Potential Deactivated User",
        email: potentialDeactivatedEmail,
        status: "suspended", // Testing different status for temporal tracking
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(potentialDeactivated);

  const deactivatedLookup: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
      connection,
      {
        email: potentialDeactivatedEmail,
      },
    );
  typia.assert(deactivatedLookup);

  TestValidator.equals(
    "deactivated user status reflects suspension",
    deactivatedLookup.status,
    "suspended",
  );
  TestValidator.predicate(
    "deactivated user has valid temporal fields",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      deactivatedLookup.created_at,
    ),
  );
  TestValidator.predicate(
    "deactivated user updated_at matches created_at",
    deactivatedLookup.updated_at === deactivatedLookup.created_at,
  );

  // Step 16: Test error handling for non-existent email
  await TestValidator.error("should fail for non-existent email", async () => {
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.email.at(
      connection,
      {
        email: "nonexistent@example.com",
      },
    );
  });
}
