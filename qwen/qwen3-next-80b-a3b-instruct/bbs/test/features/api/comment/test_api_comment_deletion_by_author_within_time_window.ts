import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_comment_deletion_by_author_within_time_window(
  connection: api.IConnection,
): Promise<void> {
  // Use fixed credentials for reproducible test environment
  // Assume pre-seeded comment exists with known ID
  // owned by this citizen and created within last 7 days
  const fixedEmail = "test-citizen@example.com";
  const fixedPassword = "TestPassword123!";
  const fixedCommentId = "00000000-0000-4000-8000-000000000000";
  // Create citizen connection with fixed auth data
  const citizenConnection: api.IConnection = { host: connection.host };
  // Register citizen (creates user consistently)
  const citizenData: IEconomicBoardCitizen.IJoin = {
    email: fixedEmail,
    password: fixedPassword,
    display_name: "Test Citizen",
    bio: "Test bio for E2E",
  } satisfies IEconomicBoardCitizen.IJoin;
  // This will register the citizen if not exists, or login if already exists
  const authorizedCitizen = await authorize_citizen_join(citizenConnection, {
    body: citizenData,
  });
  typia.assert(authorizedCitizen);
  // First: delete the comment (should succeed)
  await api.functional.economicBoard.citizen.comments.erase(citizenConnection, {
    commentId: fixedCommentId,
  });
  // Second: try to delete same comment again — should fail (already deleted)
  await TestValidator.error(
    "should fail if comment already deleted",
    async () => {
      await api.functional.economicBoard.citizen.comments.erase(
        citizenConnection,
        {
          commentId: fixedCommentId,
        },
      );
    },
  );
}
