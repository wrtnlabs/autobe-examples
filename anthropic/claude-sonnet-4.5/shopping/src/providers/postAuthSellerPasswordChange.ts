import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postAuthSellerPasswordChange(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IPasswordChange;
}): Promise<IShoppingMallSeller.IPasswordChangeResponse> {
  const { seller, body } = props;

  // Step 1: Fetch seller record to verify current password
  const sellerRecord =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: seller.id },
      select: {
        id: true,
        email: true,
        password_hash: true,
        password_history: true,
      },
    });

  // Step 2: Verify current password matches stored hash
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    sellerRecord.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  // Step 3: Validate new password complexity requirements
  const passwordValidation = validatePasswordComplexity(
    body.new_password,
    sellerRecord.email,
  );
  if (!passwordValidation.isValid) {
    throw new HttpException(passwordValidation.errorMessage, 400);
  }

  // Step 4: Parse password history and check for password reuse
  let passwordHistoryArray: Array<{ hash: string; changed_at: string }> = [];

  if (
    sellerRecord.password_history !== null &&
    sellerRecord.password_history !== undefined
  ) {
    try {
      passwordHistoryArray = JSON.parse(sellerRecord.password_history);
    } catch {
      passwordHistoryArray = [];
    }
  }

  // Verify new password is not in last 5 passwords
  for (const historyEntry of passwordHistoryArray) {
    const isReusedPassword = await PasswordUtil.verify(
      body.new_password,
      historyEntry.hash,
    );

    if (isReusedPassword) {
      throw new HttpException(
        "This password was recently used. Please choose a different password",
        400,
      );
    }
  }

  // Step 5: Hash the new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Step 6: Update password history by appending current password
  const currentTimestamp = toISOStringSafe(new Date());

  passwordHistoryArray.push({
    hash: sellerRecord.password_hash,
    changed_at: currentTimestamp,
  });

  // Maintain only last 5 passwords in history
  if (passwordHistoryArray.length > 5) {
    passwordHistoryArray = passwordHistoryArray.slice(-5);
  }

  const updatedPasswordHistory = JSON.stringify(passwordHistoryArray);

  // Step 7: Update seller record with new password and metadata
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: seller.id },
    data: {
      password_hash: newPasswordHash,
      password_changed_at: currentTimestamp,
      password_history: updatedPasswordHistory,
      updated_at: currentTimestamp,
    },
  });

  // Step 8: Invalidate all seller sessions for security
  // Note: Ideally should keep current session active, but without session
  // identifier in props, we invalidate all sessions as security measure
  await MyGlobal.prisma.shopping_mall_sessions.updateMany({
    where: {
      seller_id: seller.id,
      is_revoked: false,
    },
    data: {
      is_revoked: true,
      revoked_at: currentTimestamp,
    },
  });

  // Step 9: Return success confirmation
  return {
    message: "Password changed successfully",
  };
}

/**
 * Validates password complexity requirements. Requirements: minimum 8
 * characters, at least one uppercase, one lowercase, one digit, one special
 * character, and must not match email.
 */
function validatePasswordComplexity(
  password: string,
  email: string,
): { isValid: boolean; errorMessage: string } {
  if (password.length < 8) {
    return {
      isValid: false,
      errorMessage: "Password must be at least 8 characters long",
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      errorMessage: "Password must not exceed 128 characters",
    };
  }

  const hasUppercase = /[A-Z]/.test(password);
  if (!hasUppercase) {
    return {
      isValid: false,
      errorMessage: "Password must contain at least one uppercase letter (A-Z)",
    };
  }

  const hasLowercase = /[a-z]/.test(password);
  if (!hasLowercase) {
    return {
      isValid: false,
      errorMessage: "Password must contain at least one lowercase letter (a-z)",
    };
  }

  const hasDigit = /[0-9]/.test(password);
  if (!hasDigit) {
    return {
      isValid: false,
      errorMessage: "Password must contain at least one digit (0-9)",
    };
  }

  const hasSpecialChar = /[@$!%*?&#]/.test(password);
  if (!hasSpecialChar) {
    return {
      isValid: false,
      errorMessage:
        "Password must contain at least one special character (@, $, !, %, *, ?, &, #)",
    };
  }

  if (password.toLowerCase() === email.toLowerCase()) {
    return {
      isValid: false,
      errorMessage: "Password must not match your email address",
    };
  }

  return {
    isValid: true,
    errorMessage: "",
  };
}
