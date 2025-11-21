import { tags } from "typia";

import { IShoppingMallCustomer } from "./IShoppingMallCustomer";
import { IDeviceInfo } from "./IDeviceInfo";

export namespace IShoppingMallPasswordChange {
  /**
   * Password change request for shopping mall platform supporting customer,
   * seller, and admin password resets. Validates reset tokens while providing
   * comprehensive security tracking for password change operations across all
   * user account types.
   *
   * This DTO establishes the complete security context for password reset
   * operations by including user account reference, device fingerprinting,
   * and audit trail correlation. The user reference enables clear
   * identification of the target account while maintaining security
   * boundaries.
   *
   * The device information provides comprehensive security monitoring
   * capabilities, replacing simple string fields with structured device
   * fingerprinting for enhanced fraud detection and security analytics.
   *
   * Audit correlation ensures password change events are properly tracked and
   * can be linked to broader authentication workflows and security incident
   * management.
   */
  export type IUpdate = {
    /**
     * Password reset token received via email for password change
     * authorization. Generated during password reset request and valid for
     * single use with customizable expiration timeframe
     */
    reset_token: string & tags.Format<"uuid">;

    /**
     * Reference to the user account requesting password change. Provides
     * account context and enables security validation while maintaining
     * user privacy through summary-level information
     */
    user: IShoppingMallCustomer.ISummary;

    /**
     * New password meeting shopping mall security requirements. Must be at
     * least 8 characters with mixed case, numbers, and special characters
     * for strong authentication
     */
    new_password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">;

    /**
     * Password confirmation field for new password verification. Must
     * exactly match new_password field to prevent typing errors and ensure
     * password accuracy
     */
    confirm_password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">;

    /**
     * Comprehensive device fingerprinting information for security
     * monitoring and fraud detection. Replaces simple user agent strings
     * with complete device context for enhanced security analytics
     */
    device: IDeviceInfo;

    /**
     * Unique identifier for audit trail correlation. Links this password
     * change request to security logs and enables comprehensive incident
     * tracking across the platform
     */
    audit_log_id: string & tags.Format<"uuid">;

    /**
     * Security context and validation metadata for password change
     * operations. Contains validation results, attempt tracking, and
     * security assessment information
     */
    security_metadata: {
      /**
       * Array of validation check results performed during password
       * change request processing. Includes token validation, security
       * checks, and business rule compliance
       */
      validation_results: string[];

      /**
       * Number of password reset attempts for this user within the
       * current session or time window. Used for rate limiting and
       * security monitoring
       */
      attempt_count: number & tags.Type<"int32">;

      /**
       * Correlation identifier linking this password change to the
       * broader authentication session. Enables tracking of password
       * changes within user journey contexts
       */
      session_correlation: string & tags.Format<"uuid">;

      /**
       * Device fingerprint hash for security tracking and fraud
       * detection. Enables identification of suspicious access patterns
       * across password change attempts
       */
      device_fingerprint: string;
    };

    /**
     * ISO 8601 timestamp when password change request was initiated. Used
     * for tracking reset token usage and measuring token expiration
     * compliance
     */
    timestamp: string & tags.Format<"date-time">;
  };
}
