import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumLegalHold";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_legal_hold_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator registration (fresh admin context)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassw0rd!",
        username: RandomGenerator.name(1).toLowerCase(),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2. Registered user registration (thread author)
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.paragraph({ sentences: 2 })
          .replace(/\s+/g, "_")
          .toLowerCase(),
        email: userEmail,
        password: "UserPassw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 3. Admin creates a category to host the thread
  const category: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      {
        body: {
          code: null,
          name: `test-category-${RandomGenerator.alphabets(4)}`,
          slug: `test-category-${RandomGenerator.alphabets(4)}`,
          description: "E2E test category for legal hold retrieval",
          is_moderated: false,
          requires_verification: false,
          order: 1,
        } satisfies IEconPoliticalForumCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Registered user creates a thread in the category
  const thread: IEconPoliticalForumThread =
    await api.functional.econPoliticalForum.registeredUser.threads.create(
      connection,
      {
        body: {
          category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 6 }),
          slug: `thread-${RandomGenerator.alphaNumeric(6)}`,
          status: "open",
        } satisfies IEconPoliticalForumThread.ICreate,
      },
    );
  typia.assert(thread);

  // 5. Seed a legal hold record referencing the created thread.
  // IMPORTANT: The SDK has no public create-legal-hold endpoint. The test
  // harness MUST persist the below object into the test database (or use a
  // test-only admin tooling endpoint) so that the GET operation below returns
  // the record. Implementers should provide a helper named e.g.:
  //   async function seedLegalHoldRecord(record: IEconPoliticalForumLegalHold): Promise<void> { ... }
  // and call it here. The code below only builds the correctly-typed payload
  // to be persisted by the harness.
  const seededLegalHold: IEconPoliticalForumLegalHold = {
    id: typia.random<string & tags.Format<"uuid">>(),
    registereduser_id: null,
    post_id: null,
    thread_id: thread.id,
    moderation_case_id: null,
    hold_reason: "litigation",
    hold_start: new Date().toISOString(),
    hold_end: null,
    is_active: true,
    notes: "Seeded by E2E test harness - persist before retrieval",
    created_at: new Date().toISOString(),
  };

  // IMPLEMENTER ACTION (required for runtime): persist the seededLegalHold
  // into the test DB so that the following GET returns it. Example placeholder:
  // await seedLegalHoldRecord(seededLegalHold);

  // 6. Happy path: Administrator retrieves the seeded legal hold
  const retrieved: IEconPoliticalForumLegalHold =
    await api.functional.econPoliticalForum.administrator.legalHolds.at(
      connection,
      {
        legalHoldId: seededLegalHold.id,
      },
    );
  // Complete type validation
  typia.assert(retrieved);

  // Business assertions
  TestValidator.equals(
    "retrieved legal hold references expected thread",
    retrieved.thread_id,
    thread.id,
  );
  TestValidator.equals("retrieved hold is active", retrieved.is_active, true);

  // 7. Negative: Non-admin caller (unauthenticated/cleared headers) must not be able to retrieve
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot retrieve legal hold",
    async () => {
      await api.functional.econPoliticalForum.administrator.legalHolds.at(
        unauthConn,
        {
          legalHoldId: seededLegalHold.id,
        },
      );
    },
  );

  // 8. Negative: Not-found case - random UUID unlikely to exist
  const randomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "nonexistent legal hold id should fail",
    async () => {
      await api.functional.econPoliticalForum.administrator.legalHolds.at(
        connection,
        {
          legalHoldId: randomId,
        },
      );
    },
  );

  // 9. OPTIONAL: Audit verification (IMPLEMENTER ACTION)
  // If your environment exposes an audit API or DB inspection helper, assert
  // that an access audit entry was created for admin.id retrieving seededLegalHold.id.
  // Example (pseudocode for implementers):
  // const audit = await fetchAuditEntryFor({ action: 'legal_hold.read', targetId: seededLegalHold.id, actorId: admin.id });
  // TestValidator.predicate('audit entry present', !!audit);
}
