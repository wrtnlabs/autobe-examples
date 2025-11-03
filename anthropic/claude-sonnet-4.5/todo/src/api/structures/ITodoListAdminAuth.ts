import { tags } from "typia";

export namespace ITodoListAdminAuth {
  /**
   * Response object returned after successfully logging out the current
   * administrator session.
   *
   * This response confirms that the admin's active session has been
   * terminated by setting the expired_at timestamp in the
   * todo_list_admin_sessions table. The logout operation invalidates the
   * current JWT access token, requiring the administrator to authenticate
   * again to regain access to the system.
   *
   * The response provides both a boolean success indicator and a
   * human-readable message to inform the admin that their session has ended.
   * After receiving this response, client applications should clear stored
   * authentication tokens, reset authentication state, and redirect the admin
   * to the login page.
   *
   * This operation affects only the current session from which the logout
   * request was made, allowing the administrator to remain logged in on other
   * devices if they have multiple active sessions. The session termination is
   * recorded with a timestamp for security auditing and compliance purposes.
   */
  export type ILogoutResponse = {
    /**
     * Indicates whether the logout operation completed successfully.
     *
     * This boolean value confirms that the administrator's current session
     * has been properly terminated and the access token has been
     * invalidated. A true value means the admin has been logged out from
     * their current device/browser session and must re-authenticate to
     * access the system again.
     *
     * The success flag provides immediate feedback to the client
     * application, allowing it to clear local authentication state,
     * redirect to the login page, and update the UI appropriately.
     */
    success: boolean;

    /**
     * Human-readable confirmation message about the logout operation.
     *
     * This message provides clear feedback to the administrator that their
     * session has been successfully terminated. It serves both as a
     * confirmation of the action and as user-facing communication that can
     * be displayed in the admin interface.
     *
     * Typical messages include confirmation that the session has ended and
     * guidance about needing to log in again for future access. The message
     * maintains a professional tone appropriate for administrative
     * interfaces.
     */
    message: string;
  };

  /**
   * Response object returned after successfully logging out the administrator
   * from all active sessions across all devices.
   *
   * This response confirms that a global logout operation has been executed,
   * terminating every active session for the authenticated administrator by
   * setting the expired_at timestamp for all session records in the
   * todo_list_admin_sessions table where expired_at was previously null. This
   * comprehensive session termination invalidates all existing JWT access
   * tokens for this admin, requiring re-authentication on every device and
   * browser where they were logged in.
   *
   * The response provides a success indicator, a human-readable confirmation
   * message, and critically, a count of how many sessions were terminated.
   * This session count gives the administrator visibility into how many
   * active logins existed and were revoked, which is valuable for security
   * awareness and monitoring.
   *
   * This global logout functionality is essential for security scenarios such
   * as suspected account compromise, lost devices, forgotten logouts on
   * public computers, or deliberate security policy enforcement. After
   * receiving this response, the admin must log in again on every device to
   * regain access to the system. The operation creates a complete audit trail
   * with expiration timestamps for all affected sessions, supporting security
   * monitoring and compliance requirements.
   */
  export type ILogoutAllResponse = {
    /**
     * Indicates whether the global logout operation completed successfully.
     *
     * This boolean value confirms that all of the administrator's active
     * sessions across all devices and browsers have been properly
     * terminated. A true value means every session has been expired and all
     * existing JWT access tokens for this admin are now invalid, requiring
     * re-authentication on every device.
     *
     * The success flag provides immediate feedback about the completion of
     * this critical security operation, allowing the client application to
     * update its authentication state and inform the administrator that
     * access has been revoked everywhere.
     */
    success: boolean;

    /**
     * Human-readable confirmation message about the global logout
     * operation.
     *
     * This message provides clear feedback to the administrator that all
     * their sessions have been successfully terminated across all devices.
     * It communicates the scope of the operation and confirms that
     * re-authentication will be required on every device where they were
     * previously logged in.
     *
     * Typical messages include confirmation of the global logout and
     * explanation that the admin must log in again on all devices. The
     * message maintains a professional tone appropriate for
     * security-critical operations in administrative interfaces.
     */
    message: string;

    /**
     * The total number of active sessions that were terminated by this
     * operation.
     *
     * This count represents how many distinct admin sessions were expired,
     * providing visibility into the scope of the logout action. Each
     * session corresponds to a separate login from a specific device or
     * browser, so this number indicates how many locations the admin was
     * actively logged in from.
     *
     * For example, if an admin was logged in from their laptop, phone, and
     * tablet, this value would be 3. This information is valuable for
     * security monitoring - an unexpectedly high number might indicate
     * unauthorized access, while a count of 1 suggests the admin was only
     * logged in from the current device.
     *
     * The count includes the current session from which the logout request
     * was made, so the minimum value for a successful operation is 1.
     */
    sessions_terminated: number & tags.Type<"int32">;
  };
}
