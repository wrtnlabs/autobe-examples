# Seller Onboarding and Approval Requirements

## Seller Registration Requirements

THE shoppingMall system SHALL require all prospective sellers to provide complete and accurate information during registration.

WHEN a user selects the \"Become a Seller\" option, THE system SHALL prompt for the following mandatory fields:
- Legal business name
- Business registration number or tax ID
- Physical business address (not P.O. Box)
- Contact phone number with country code
- Official business email address (separate from personal email)
- Owner/manager full legal name
- Owner/manager government-issued photo ID number
- Website or social media presence (if applicable)

THE system SHALL prevent form submission if any of the above fields are incomplete or contain invalid data formats.

WHERE a user attempts to register with an email address already associated with an existing customer account, THE system SHALL deny registration and display message: \"This email address is already in use. Please use a different email address for your business account.\"

WHEN a user attempts to register with a business name that matches an existing approved seller, THE system SHALL display message: \"This business name is already in use by another approved seller. Please verify the business details and try again.\"

## Documentation Submission Process

WHEN a seller completes the registration form, THE system SHALL require upload of the following documents:

- Business license or official registration certificate issued by government authority (PDF or JPEG)
- Government-issued photo ID of business owner or authorized representative (PDF or JPEG)
- Proof of business address (utility bill or bank statement dated within last 90 days, PDF or JPEG)

THE system SHALL accept only PDF, JPG, and JPEG file formats with maximum size of 5MB per document.

WHEN a document upload exceeds 5MB, THE system SHALL display message: \"Document exceeds maximum size of 5MB. Please compress the file and try again.\"

WHILE a document is being uploaded, THE system SHALL display progress indicator and prevent navigation away from the page until upload completes or exceptions occur.

WHEN a file is uploaded with unsupported format, THE system SHALL display message: \"Unsupported file format. Please upload your document as PDF, JPG, or JPEG.\"

## Verification and Validation Rules

THE system SHALL apply the following automated validation rules to all submitted documents:

- Business registration number SHALL match official government database records (if available through third-party verification service)
- Business name SHALL be consistent across registration form and submitted business license
- Business address SHALL match both registration form and proof of address document
- Photo ID SHALL be valid, unexpired, and match the owner/manager name provided
- Photo ID SHALL not show signs of tampering (detected by AI image analysis)
- Business license SHALL be issued by a recognized government authority in the registered country
- Utility bill or bank statement SHALL display business name and address exactly as registered

IF the system detects a mismatch between any of the above data points, THE system SHALL classify the application as \"Requires Manual Review\" and notify admin team.

THE system SHALL automatically reject applications with:
- Expired business license
- Blurred, cropped, or illegible documents
- Watermarked documents from non-official sources
- Documents from non-recognized jurisdictions (countries not supported by the platform)

WHEN a seller submits more than three applications within 30 days with failures or rejections, THE system SHALL temporarily block further submissions and notify the user: \"Your account has been temporarily restricted due to repeated submission failures. Please contact support for assistance.\"

## Approval Workflow

WHEN a seller application passes automated validation, THE system SHALL initiate a three-stage approval workflow:

1. Initial Review: Admin agent 1 validates documents and business information
2. Compliance Review: Admin agent 2 checks for legal and regulatory compliance
3. Final Approval: Senior admin reviews flagged applications and approves or rejects

WHILE an application is under review, THE system SHALL display status: \"In Review\" to the seller and prevent product listing.

ITS SHALL take a maximum of 48 business hours (Monday-Friday, 9AM-5PM Korea time) for a complete approval cycle.

WHEN an application is approved by all three reviewers, THE system SHALL:
- Update seller account status to \"Approved\"
- Send email notification: \"Congratulations! Your seller account has been approved. You may now list products.\"
- Enable access to seller dashboard and product listing tools
- Notify customer support team of new active seller

## Rejection Conditions

IF an application fails any validation rule, THE system SHALL notify the seller with specific rejection reason:

- \"The business registration number provided could not be verified with government records. Please ensure the number is accurate and the business is legally registered.\"
- \"The uploaded business license has expired. Please submit a valid, current license.\"
- \"The photo ID submitted does not match the owner name provided in the application.\"
- \"The proof of address document does not display the business name or address as provided.\"
- \"Documents appear to be altered, forged, or tampered with.\"
- \"The business operates in a prohibited category (e.g., tobacco, weapons, adult content).\"
- \"The business is already listed under another approved seller account.\"
- \"Multiple failed attempts to submit valid documentation within a 30-day period.\"

THE system SHALL require sellers to complete a review of the rejection reason before resubmitting an application.

WHILE an application is rejected, THE system SHALL prevent any product upload attempts and disable access to seller dashboard.

## Appeal Process

IF a seller believes their application was rejected in error, THE system SHALL provide a formal appeal process:

WHEN a seller clicks \"Appeal Rejection\", THE system SHALL:
- Log the appeal request in system audit trail
- Generate a reference number for the appeal
- Notify designated appeal reviewer (senior admin) via internal notification
- Provide form for seller to upload additional supporting documentation
- Allow seller to write a detailed explanation (up to 1000 characters)

THE appeal reviewer SHALL have 72 business hours to review the appeal and respond.

WHEN an appeal is approved, THE system SHALL:
- Override previous rejection status
- Return application to initial review queue
- Send notification: \"Your appeal has been approved. Your seller application is now under review again.\"

WHEN an appeal is denied, THE system SHALL send notification: \"Your appeal has been denied. This decision is final. You may try again after 90 days.\"

## Onboarding Timeline Expectations

THE system SHALL ensure that from the moment a seller submits their application to final approval, the process takes no longer than 48 business hours under normal circumstances.

THE system SHALL display estimated completion timeline to seller: \"Your application will be reviewed within 48 business hours.\"

WHERE a seller application exceeds 48 business hours without status change, THE system SHALL automatically escalate to senior admin for review and notify seller: \"Your application has been escalated due to processing delay. We will resolve this within 24 hours.\"

WHEN an initial application is rejected, THE system SHALL permit resubmission immediately after the seller corrected the identified issues.

WHEN an appeal is denied, THE system SHALL prevent further applications from the same business entity for 90 calendar days.

THE system SHALL retain all seller onboarding documentation for a minimum of 7 years after account closure or termination, in compliance with financial reporting and legal requirements.