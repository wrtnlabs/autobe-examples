import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { prepare_random_todo_user_email_verification } from "../../../prepare/prepare_random_todo_user_email_verification";
import { generate_random_todo_user_email_verifications_create } from "../../../generate/generate_random_todo_user_email_verifications_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_email_verification_retrieval_with_valid_token(connection: api.IConnection): Promise<void> {
    // 1. Register a new user
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
        body: { }
    });
    
    // 2. Create email verification token
    const verification = await generate_random_todo_user_email_verifications_create(userConnection, {
        body: { }
    });
    
    // 3. Retrieve email verification details
    const retrievedVerification = await api.functional.todo.user.email_verifications.at(userConnection, {
        verificationId: verification.id,
    });
    typia.assert(retrievedVerification);
    
    // 4. Validate expiration timestamp within 15 minutes window
    const createdAt = new Date(retrievedVerification.created_at);
    const expiresAt = new Date(retrievedVerification.expires_at);
    const timeDiffMs = expiresAt.getTime() - createdAt.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60); // Convert ms to minutes
    TestValidator.equals("Expires within 15 minutes", timeDiffMinutes >= 14.9 && timeDiffMinutes <= 15.1, true);
}