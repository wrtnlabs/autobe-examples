import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallCustomer {
  /**
   * Customer account creation data structure for new customer registration in
   * the shopping mall platform.
   *
   * Contains all required information for establishing customer identity
   * including authentication credentials, personal details, and session
   * context for secure account creation.
   *
   * The creation process validates email uniqueness, password strength
   * requirements, and establishes proper audit trails through session
   * metadata collection.
   *
   * Upon successful registration, the system creates a customer record in the
   * shopping_mall_customers table with 'pending_verification' status and
   * initiates email verification workflows for account security.
   *
   * Session context fields (ip, href, referrer) are essential for self-signup
   * operations to establish comprehensive audit trails and connection
   * metadata for the customer's initial session creation, supporting security
   * monitoring and compliance requirements.
   */
  export type ICreate = {
    /**
     * Customer email address used for account authentication and
     * communication.
     *
     * Must be unique across all customer accounts in the platform.
     * Validated against RFC 5322 email format standards.
     *
     * Serves as the primary identifier for customer accounts and is used
     * for authentication, notifications, and account recovery processes.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password provided by the customer for authentication.
     *
     * Will be securely hashed using bcrypt algorithm before storage in the
     * database.
     *
     * Subject to password strength validation including minimum length
     * requirements and complexity rules to ensure account security.
     */
    password: string;

    /**
     * Customer's first name for personalization and identification
     * purposes.
     *
     * Used throughout the platform for personalized greetings, order
     * processing, and customer service interactions.
     *
     * Supports proper customer identification and enhances the personalized
     * shopping experience.
     */
    first_name: string;

    /**
     * Customer's last name for complete identification and formal
     * addressing.
     *
     * Complements the first name for full customer identification and
     * supports proper order verification processes.
     *
     * Essential for customer support interactions and formal communication
     * requirements.
     */
    last_name: string;

    /**
     * Optional customer contact phone number for order updates and support
     * communications.
     *
     * Provides an alternative contact method for urgent order notifications
     * and customer service interactions.
     *
     * When provided, supports SMS notifications and phone-based customer
     * support workflows.
     */
    phone_number?: string | undefined;

    /**
     * Client IP address for session audit trail and security monitoring.
     *
     * Optional field as the server can extract IP information from the
     * request headers.
     *
     * When provided by the client, supports server-side rendering scenarios
     * and enhances audit trail accuracy.
     *
     * Should be in valid IPv4 or IPv6 format when explicitly provided by
     * the client.
     */
    ip?: string | undefined;

    /**
     * Current page URL where the registration request originated.
     *
     * Required field that captures the exact location of the registration
     * form for session context tracking.
     *
     * Enables proper session tracking, security monitoring, and user
     * journey analysis for registration flows.
     */
    href: string;

    /**
     * Previous page URL that directed the customer to the registration
     * page.
     *
     * Required field that captures the referral source for marketing
     * attribution and user journey tracking.
     *
     * Supports comprehensive audit trails and helps understand customer
     * acquisition channels.
     */
    referrer: string;
  };

  /**
   * Customer authentication request containing credentials and session
   * context for secure login.
   *
   * This DTO represents the complete authentication payload required for
   * customer login operations. It includes email and password for credential
   * validation against the shopping_mall_customers table, along with session
   * context information recorded in shopping_mall_customer_sessions for
   * security and audit purposes.
   *
   * The operation validates customer account status, performs password
   * verification using bcrypt comparison, and establishes a secure session
   * with comprehensive connection tracking. Session context fields provide
   * essential audit trail information for security monitoring and customer
   * experience analysis.
   *
   * This structured approach ensures secure authentication while maintaining
   * detailed session records for security analysis, customer journey
   * tracking, and compliance with authentication best practices.
   */
  export type ILogin = {
    /**
     * Customer email address used for authentication and account
     * identification. Must match the registered email stored in the
     * shopping_mall_customers.email column.
     *
     * This email undergoes validation against the customer database records
     * and must be unique across all customer accounts. The system performs
     * case-insensitive matching for authentication while preserving the
     * original case for display and communication purposes.
     *
     * Email format validation follows RFC 5322 standards and requires a
     * valid email structure with proper domain configuration. The email
     * serves as the primary identifier for customer authentication and
     * account management operations.
     */
    email: string & tags.Format<"email">;

    /**
     * Customer password for authentication verification against the stored
     * password_hash. This plain text password undergoes bcrypt comparison
     * with the shopping_mall_customers.password_hash column value.
     *
     * Password validation includes checking account status, verification
     * requirements, and security policies. The system compares the provided
     * password against the hashed value using secure bcrypt algorithms for
     * authentication security.
     *
     * While password strength requirements are enforced during
     * registration, login focuses on hash comparison rather than
     * re-validation of password complexity rules.
     */
    password: string;

    /**
     * Client IP address for session tracking and security analysis. This
     * field is optional as the server can extract the IP address from
     * request headers automatically.
     *
     * When provided, the IP address supplements server-side detection and
     * is recorded in shopping_mall_customer_sessions for audit purposes. It
     * helps track connection patterns and detect suspicious activity across
     * authentication events.
     *
     * Server-side IP extraction remains the primary method, with
     * client-provided IP serving as supplementary information for enhanced
     * security monitoring.
     */
    ip?: string | undefined;

    /**
     * Connection URL where the customer session is being established. This
     * represents the current page URL where authentication occurs and
     * provides essential context for session management.
     *
     * The href value is recorded in shopping_mall_customer_sessions for
     * security monitoring and customer journey tracking. It helps identify
     * application entry points and understand customer navigation patterns
     * for improved user experience.
     *
     * This field provides critical context that cannot be reliably inferred
     * server-side, making it essential for comprehensive session management
     * and security analysis.
     */
    href: string & tags.Format<"uri">;

    /**
     * Referrer URL that directed the customer to the authentication
     * endpoint. This indicates the previous page or source that initiated
     * the login attempt.
     *
     * The referrer information is stored in shopping_mall_customer_sessions
     * for security analysis and customer journey mapping. It helps detect
     * potential phishing attempts and understand navigation flows for
     * enhanced security monitoring.
     *
     * This field provides valuable context for identifying suspicious
     * referral patterns and improving the overall customer authentication
     * experience.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Refresh token request for extending customer authentication session
   * validity.
   *
   * This DTO contains the refresh token required for renewing customer
   * sessions without complete re-authentication. The operation validates the
   * token against active customer sessions and generates new access/refresh
   * tokens while maintaining session context continuity.
   *
   * The refresh mechanism supports long-term customer engagement by reducing
   * login frequency interruptions while maintaining security through proper
   * token validation and rotation. This operation preserves audit trails and
   * security monitoring by extending authentication validity while tracking
   * session activity.
   *
   * This structured approach ensures customer convenience without
   * compromising security, providing a balanced solution for authentication
   * continuity and session management best practices.
   */
  export type IRefresh = {
    /**
     * Refresh token obtained from previous authentication operations for
     * session renewal. This token is validated against active sessions in
     * the shopping_mall_customer_sessions table to ensure it belongs to a
     * valid, non-expired customer session.
     *
     * Token validation includes checking session expiration, customer
     * account status, and security policies. Successful validation results
     * in new token generation while preserving the existing session context
     * and connection information for authentication continuity.
     *
     * The refresh mechanism supports seamless customer experience by
     * extending session validity without requiring full re-authentication,
     * maintaining engagement while ensuring security through proper token
     * rotation.
     */
    refresh_token: string;
  };

  /**
   * Authentication response containing comprehensive customer information and
   * secure session tokens.
   *
   * This DTO represents the successful authentication response, providing
   * customers with their complete identification information and secure
   * tokens for accessing the shopping platform. The response includes
   * essential customer details from the shopping_mall_customers table along
   * with generated authentication tokens for session management.
   *
   * The authorization response enables immediate personalized experience by
   * including customer name information while providing the necessary tokens
   * for secure API access. It supports seamless customer onboarding to the
   * shopping platform after successful authentication, whether through
   * registration or login operations.
   *
   * This comprehensive response ensures customers have all required
   * information for engaging with the platform while maintaining security
   * through proper token-based authentication for subsequent operations. The
   * response structure supports customer experience personalization, session
   * continuity, and platform security requirements.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated customer from the
     * shopping_mall_customers table.
     *
     * This ID represents the customer's primary key in the database and is
     * used for all customer-specific operations and data retrieval. It
     * links the authentication response to the customer's account
     * information and personal data.
     *
     * The customer ID is essential for subsequent API calls that require
     * customer context, such as accessing shopping carts, order history,
     * and personalized shopping experiences.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Customer email address used for authentication and communication.
     * Must be unique across all customers and validated against RFC 5322
     * email format standards.
     *
     * This email serves as the primary authentication identifier and
     * communication channel for customer account management. It supports
     * order notifications, marketing communications, and account
     * verification workflows.
     *
     * The email address is validated during registration and authentication
     * processes to ensure proper customer identification and secure account
     * access.
     */
    email: string & tags.Format<"email">;

    /**
     * Customer's first name for personalization and user interface display.
     *
     * This field is retrieved from the shopping_mall_customers table and
     * provides personalized greeting and user experience elements. It helps
     * create a more engaging and customer-centric shopping environment.
     *
     * The first name is included in the authorization response to
     * immediately personalize the customer experience upon successful
     * authentication.
     */
    first_name: string;

    /**
     * Customer's last name for complete identification and personalized
     * interactions.
     *
     * Retrieved from the customer's account information in
     * shopping_mall_customers, this field complements the first name for
     * full customer identification. It supports proper addressing and
     * personalized communication throughout the shopping experience.
     *
     * Including both name components in the authorization response enhances
     * the personalized customer journey from the moment of authentication.
     */
    last_name: string;

    /**
     * Customer contact phone number for order updates, support
     * communications, and account verification.
     *
     * This optional field provides an alternative communication channel for
     * urgent notifications and customer support interactions. Phone number
     * validation ensures proper formatting when provided.
     *
     * The phone number supports order tracking notifications, delivery
     * coordination, and account recovery processes when email communication
     * is insufficient.
     */
    phone_number?: string | undefined;

    /**
     * Customer account status indicating active, suspended, or pending
     * verification state.
     *
     * The status field reflects the current operational state of the
     * customer account within the shopping platform. Valid status values
     * include: active (fully operational), suspended (temporarily
     * restricted), and pending_verification (awaiting email confirmation).
     *
     * Account status management ensures proper access control and supports
     * security workflows for customer account management and platform
     * integrity.
     */
    status: string;

    /**
     * Timestamp when customer account was created in the shopping mall
     * platform.
     *
     * This timestamp records the exact moment of customer registration and
     * account establishment. It supports account lifecycle tracking,
     * customer analytics, and platform growth analysis.
     *
     * The creation timestamp provides context for customer tenure and
     * supports account management workflows including account age-based
     * features and loyalty program eligibility.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp when customer account information was last updated.
     *
     * This field tracks the most recent modification to customer account
     * details, supporting audit trails and data freshness monitoring.
     * Updates include profile changes, preference updates, and account
     * status modifications.
     *
     * The updated timestamp helps identify recent account activity and
     * supports data synchronization workflows across platform services.
     */
    updated_at: string & tags.Format<"date-time">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Compact customer representation for list views, search results, and
   * relationship references.
   *
   * Provides essential customer identification information while excluding
   * sensitive data like passwords and detailed contact information. This
   * summary format optimizes performance for customer listing operations
   * while maintaining sufficient context for customer identification and
   * relationship management.
   *
   * Used in administrative interfaces, customer search results, order
   * references, and relationship contexts where full customer profiles are
   * not required. The summary prevents information overload while supporting
   * efficient customer management workflows.
   *
   * Customer orders and detailed profiles are accessed via separate endpoints
   * to maintain security boundaries and performance optimization. This
   * approach ensures that customer data is presented appropriately based on
   * context and access permissions.
   */
  export type ISummary = {
    /**
     * Unique customer identifier generated automatically using UUID v4 for
     * secure reference.
     *
     * Serves as the primary key for customer identification across the
     * shopping mall platform. This identifier remains constant throughout
     * the customer lifecycle and supports secure data relationships.
     *
     * The customer ID enables efficient database operations, API
     * integrations, and cross-system references while maintaining customer
     * privacy. It provides a stable reference point for all
     * customer-related activities.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Customer email address used for authentication, communication, and
     * account identification.
     *
     * Serves as the primary contact method for order notifications,
     * marketing communications, and account recovery. Email addresses must
     * be unique across the platform and validated for format correctness.
     *
     * This field supports customer identification, communication workflows,
     * and account management. It ensures that customers can be reached for
     * important updates and service communications.
     */
    email: string & tags.Format<"email">;

    /**
     * Customer's first name for personalization, order processing, and
     * customer service interactions.
     *
     * Used to personalize communications, verify order details, and provide
     * friendly customer service. First names help create a personalized
     * shopping experience and build customer relationships.
     *
     * This information supports order verification, shipping label
     * generation, and customer support workflows. It enhances the customer
     * experience through personalized interactions.
     */
    first_name: string;

    /**
     * Customer's last name for complete identification, order verification,
     * and professional communication.
     *
     * Provides the full customer name for order processing, shipping
     * documentation, and formal communications. Last names help distinguish
     * between customers with similar first names and support accurate
     * record keeping.
     *
     * Combined with the first name, this field enables proper customer
     * identification and supports business processes requiring full
     * customer names.
     */
    last_name: string;

    /**
     * Customer contact phone number for order updates, delivery
     * coordination, and support communications.
     *
     * Optional contact information that provides an alternative
     * communication channel for time-sensitive updates. Phone numbers may
     * be used for delivery notifications, fraud prevention, and urgent
     * support situations.
     *
     * This field enhances customer service capabilities by providing
     * multiple contact methods. It supports delivery coordination and
     * urgent communication needs when email is insufficient.
     */
    phone_number?: string | undefined;

    /**
     * Customer account status indicating the current state of the
     * customer's platform access.
     *
     * Valid status values include: active (fully functional account),
     * suspended (temporarily restricted), pending_verification (awaiting
     * email confirmation). Status management supports account security,
     * compliance, and customer service workflows.
     *
     * This field enables appropriate access control, communication
     * handling, and account management. It ensures that customer accounts
     * are managed according to platform policies and security
     * requirements.
     */
    status: string;

    /**
     * Customer account creation timestamp indicating when the customer
     * registered on the platform.
     *
     * Recorded automatically during customer registration and serves as the
     * official account creation date. This timestamp supports customer
     * lifecycle analysis, retention tracking, and account management.
     *
     * The creation date helps identify new customers, track platform
     * growth, and analyze customer behavior patterns. It provides context
     * for customer relationship duration and engagement history.
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Last customer account update timestamp tracking when account
     * information was modified.
     *
     * Updated automatically whenever customer profile details change,
     * including personal information, preferences, or status updates. This
     * field supports account management and data integrity.
     *
     * The update timestamp helps identify recent account activity, track
     * profile changes, and maintain audit trails. It ensures that customer
     * information remains current and accurately reflected across the
     * platform.
     */
    updated_at?: (string & tags.Format<"date-time">) | undefined;
  };
}
