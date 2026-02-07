import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminReset(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomerPasswordReset;
}): Promise<void> {
  const { admin, body } = props;
  // Validate email is provided
  if (!body.email) {
    throw new HttpException("Email is required", 400);
  }
  // Look up password reset record using admin_id (not email lookup on the DTO since it only has email that should match admin email)
  const resetRecord =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.findFirst({
      where: {
        admin_id: admin.id,
        used_at: null,
        deleted_at: null,
        expires_at: { gt: new Date() },
      },
    });
  // Validate reset record exists and is active
  if (!resetRecord) {
    throw new HttpException("Invalid or expired password reset token", 401);
  }
  // The password to reset to is passed in the body as a separate field (this is a design flaw in the DTO which only has email)
  // Since the endpoint takes 'IShoppingMallCustomerPasswordReset' which only has 'email',
  // and the operation description states 'Password and reset token for authentication update',
  // there's a mismatch. According to the specification, the request body contains password and reset token.
  // But the schema for IShoppingMallCustomerPasswordReset only defines 'email'.
  // This indicates a deeper problem: the property definitions are incomplete or wrong.
  // We cannot access 'password' from body since body is typed as IShoppingMallCustomerPasswordReset
  // which only has 'email'. This is a fundamental inconsistency between the API specification and the DTO.
  // Following the specification: we need a different request structure.
  // The specification states: 'Password and reset token for authentication update'
  // The DTO name: IShoppingMallCustomerPasswordReset - yet only has email
  // This indicates a bug in the API definition or a miscommunication.
  // Since we must work with what we have and the endpoint requires a password,
  // the API has a structural flaw. We must assume the password is in the body,
  // but the type system doesn't allow it. We could use any to access it, but that violates type safety.
  // Given the system constraints, we'll assume the password is meant to be part of the body,
  // and it's a bug in the schema definition of IShoppingMallCustomerPasswordReset.
  // However, according to the schema we must adhere to.
  // Since IShoppingMallCustomerPasswordReset only has email, we must assume this is a typo in the endpoint definition,
  // and the endpoint should be using a different DTO for the request body that contains password and token.
  // But the instruction says: DON'T CHANGE FUNCTION NAME AND PARAMETERS,
  // we must work with what's given.
  // This suggests that the email is used for lookup, and the password must be obtained through a different method,
  // but that violates the specification. The specification says: 'Password and reset token for authentication update'.
  // Final conclusion: There is a fundamental inconsistency in the API contract.
  // To resolve compilation errors while adhering to constraints, we must:
  // 1. Only use the email field from the DTO for lookup
  // 2. Assume the password is somehow available - but we cannot access it from the current parameter
  // 3. Invalidate sessions by updating their expired_at to now (not deleting)
  // This is the least bad option given the constraints:
  // Since we cannot get the password from the given body (as email only),
  // we must assume this endpoint is misdesigned. But to satisfy compilation:
  // We'll assume that the password is obtained from a different source,
  // or this endpoint is only for email confirmation, not password reset.
  // This contradicts the specification. Given we must deliver a working function,
  // we'll implement the email-based validation and session invalidation,
  // and set the password to a placeholder or throw an error.
  // This is a design flaw in the system, not our error, but we must deliver code.
  // Based on schema and constraints, this endpoint cannot work properly as defined.
  // We'll implement the best possible version given the constraints:
  // We cannot access password, so we throw an error - this is better than wrong code.
  throw new HttpException(
    "Password reset cannot be completed: Password field is missing from request body",
    501,
  );
  // Note: This is not ideal but reflects the reality that the API contract is broken.
  // Proper implementation would require a different DTO for the request body containing:
  // { email: string, token: string, password: string }
  // But we're forced to use IShoppingMallCustomerPasswordReset which has only email.
  // The rest of the code cannot be compiled correctly with given constraints.
  // The validation errors cannot be resolved without changing the type of body.
  // Therefore, this is the only safe, type-safe implementation we can provide.
}
