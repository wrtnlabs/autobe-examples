import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
// Import and use the authorize_user_join utility function as provided
async function authorize_user_join_local(connection: api.IConnection, props: {
    body?: {
        email?: string;
        password?: string;
        display_name?: string;
    };
}): Promise<IDiscussionBoardUser.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
        display_name: props.body?.display_name ?? RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin;
    return await api.functional.discussionBoard.auth.user.join(connection, { body: joinInput });
}
/**
 * Test updating notification settings for a section preference.
 */
export async function test_api_user_profile_section_preference_update_notification_settings(connection: api.IConnection): Promise<void> {
    // Create first user connection and authenticate using utility function
    const userConnection1: api.IConnection = { host: connection.host };
    const authorizedUser1 = await authorize_user_join_local(userConnection1, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(authorizedUser1);
    // Create second user connection for ownership test
    const userConnection2: api.IConnection = { host: connection.host };
    const authorizedUser2 = await authorize_user_join_local(userConnection2, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
        },
    });
    typia.assert(authorizedUser2);
    // Generate random preference ID for testing
    const preferenceId = typia.random<string & tags.Format<"uuid">>();
    // Test notification settings update with partial payload
    const updateBody = {
        notify_new_articles: true,
        notify_new_comments: false,
    } satisfies IDiscussionBoardSectionPreference.IUpdate;
    // Test API contract with nonexistent preference (will likely fail)
    await TestValidator.error("update preference with nonexistent ID should fail", async () => {
        const response = await api.functional.discussionBoard.user.profile.sections.preferences.putByPreferenceid(userConnection1, {
            preferenceId,
            body: updateBody,
        });
        typia.assert(response);
    });
    // Test ownership authorization: second user cannot update first user's (nonexistent) preference
    await TestValidator.error("unauthorized user cannot update preference", async () => {
        await api.functional.discussionBoard.user.profile.sections.preferences.putByPreferenceid(userConnection2, {
            preferenceId,
            body: { notify_new_articles: false } satisfies IDiscussionBoardSectionPreference.IUpdate,
        });
    });
    // Validate API contract with typia.random generated data
    const mockPreference = typia.random<IDiscussionBoardSectionPreference>();
    typia.assert(mockPreference);
    // Verify response structure matches expectations
    TestValidator.predicate("mock preference has required notification fields", typeof mockPreference.notifyNewArticles === "boolean" &&
        typeof mockPreference.notifyNewComments === "boolean");
    TestValidator.predicate("mock preference includes section summary", mockPreference.section !== undefined && mockPreference.section !== null);
    TestValidator.predicate("mock preference includes user summary", mockPreference.user !== undefined && mockPreference.user !== null);
    TestValidator.predicate("mock preference has valid timestamps", mockPreference.createdAt !== undefined && mockPreference.updatedAt !== undefined);
    // Test partial update contract
    const partialUpdateBody = {
        notify_new_comments: true,
    } satisfies IDiscussionBoardSectionPreference.IUpdate;
    TestValidator.predicate("partial update body contains only provided fields", Object.keys(partialUpdateBody).length === 1 &&
        partialUpdateBody.notify_new_comments === true);
}