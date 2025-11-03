import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsVisitorUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitorUser";

/**
 * Test visitor registration duplicate username rejection
 *
 * This test validates that the politicsBBS visitor registration system properly
 * rejects duplicate usernames. The test follows this flow:
 *
 * 1. Create an initial visitor account with unique credentials
 * 2. Attempt to create a second visitor account with the same username
 * 3. Verify that the duplicate username attempt fails with appropriate error
 *
 * The test ensures username uniqueness enforcement in the visitor registration
 * system while maintaining proper request body structure and type safety.
 */
export async function test_api_visitor_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Step 1: Create initial visitor account with unique username
  const visitorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">
  >();
  const initialVisitor = await api.functional.auth.visitor.join(connection, {
    body: {
      username: visitorUsername,
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\\\d).*$">
      >(),
      href: "https://politicsbbs.example.com/register",
      referrer: "https://politicsbbs.example.com/home",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IPoliticsBbsVisitorUser.IJoin,
  });
  typia.assert(initialVisitor);

  // Step 2: Attempt to create duplicate visitor account with same username
  await TestValidator.error(
    "duplicate username should be rejected",
    async () => {
      await api.functional.auth.visitor.join(connection, {
        body: {
          username: visitorUsername, // Same username - should fail
          password: typia.random<
            string &
              tags.MinLength<8> &
              tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\\\d).*$">
          >(),
          href: "https://politicsbbs.example.com/register",
          referrer: "https://politicsbbs.example.com/home",
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IPoliticsBbsVisitorUser.IJoin,
      });
    },
  );
}
