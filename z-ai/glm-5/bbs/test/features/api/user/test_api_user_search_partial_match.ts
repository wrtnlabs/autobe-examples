import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_search_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all users to get baseline dataset
  const allUsers = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(allUsers);
  // Skip test if no users exist
  if (allUsers.data.length === 0) {
    return;
  }
  // 2. Test partial match on displayName
  const sampleUser = RandomGenerator.pick(allUsers.data);
  const partialDisplayName = RandomGenerator.substring(sampleUser.displayName);
  if (partialDisplayName.length > 0) {
    const displayNameSearch = await api.functional.discussionBoard.users.index(
      connection,
      {
        body: {
          displayName: partialDisplayName,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(displayNameSearch);
    // Verify all returned users contain the partial displayName
    TestValidator.predicate(
      "displayName partial match - all results contain search term",
      displayNameSearch.data.every((result) =>
        result.displayName
          .toLowerCase()
          .includes(partialDisplayName.toLowerCase()),
      ),
    );
    // Verify the sample user is included in results
    TestValidator.predicate(
      "displayName partial match - sample user found",
      displayNameSearch.data.some((result) => result.id === sampleUser.id),
    );
  }
  // 3. Test partial match on email
  if (sampleUser.email.length > 0) {
    const partialEmail = RandomGenerator.substring(sampleUser.email);
    if (partialEmail.length > 0) {
      const emailSearch = await api.functional.discussionBoard.users.index(
        connection,
        {
          body: {
            email: partialEmail,
          } satisfies IDiscussionBoardUser.IRequest,
        },
      );
      typia.assert(emailSearch);
      // Verify all returned users contain the partial email
      TestValidator.predicate(
        "email partial match - all results contain search term",
        emailSearch.data.every((result) =>
          result.email.toLowerCase().includes(partialEmail.toLowerCase()),
        ),
      );
      // Verify the sample user is included in results
      TestValidator.predicate(
        "email partial match - sample user found",
        emailSearch.data.some((result) => result.id === sampleUser.id),
      );
    }
  }
  // 4. Test case-insensitive search on displayName
  const sampleDisplayName = sampleUser.displayName;
  const upperDisplayName = sampleDisplayName.toUpperCase();
  const lowerDisplayName = sampleDisplayName.toLowerCase();
  // Test with uppercase
  const upperCaseSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        displayName: upperDisplayName,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(upperCaseSearch);
  TestValidator.predicate(
    "case-insensitive displayName search - uppercase query finds sample user",
    upperCaseSearch.data.some((result) => result.id === sampleUser.id),
  );
  // Test with lowercase
  const lowerCaseSearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        displayName: lowerDisplayName,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(lowerCaseSearch);
  TestValidator.predicate(
    "case-insensitive displayName search - lowercase query finds sample user",
    lowerCaseSearch.data.some((result) => result.id === sampleUser.id),
  );
}
